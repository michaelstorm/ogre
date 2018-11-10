from collections import defaultdict
from copy import deepcopy
from frozendict import frozendict
from pprint import pprint
import itertools
import json
import random
import yaml
import sys


def is_iterable(object):
    return hasattr(object, '__iter__')


class FrozenCollectionEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, frozenset) or isinstance(obj, set):
            return [self.default(x) for x in obj]
        elif isinstance(obj, frozendict):
            return {x: self.default(y) for x, y in obj.items()}
        else:
            return obj


class CommonEqualityMixin(object):
    def __eq__(self, other):
        return (isinstance(other, self.__class__)
                and self.__dict__ == other.__dict__)

    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return hash(frozendict(self.__dict__))


class Class(CommonEqualityMixin):
    def __init__(self, name, quiz_sets=[]):
        self.name = name
        self.fields = {}
        self.quiz_sets = list(quiz_sets)

    def __repr__(self):
        return '<Class {}>'.format(self.name)

    @property
    def required_fields(self):
        return [field for field in self.fields.values() if field.determinative]

    def __hash__(self):
        return hash(self.name)


class Field(CommonEqualityMixin):
    def __init__(self, name, class_spec, value_type, collection_type, determinative):
        self.name = name
        self.class_spec = class_spec
        self.value_type = value_type
        self.collection_type = collection_type
        self.determinative = determinative

    def __repr__(self):
        type_pointer = ''
        if self.value_type:
            if self.value_type.name != self.name:
                type_pointer = '->{}'.format(self.value_type.name)
        else:
            type_pointer = ' (lit.)'

        det = '' if self.determinative else ' (non-det.)'
        return '<Field {}{} {}{}>'.format(self.name, type_pointer, self.collection_type, det)


class Definition(CommonEqualityMixin):
    def __init__(self, name, class_spec):
        self.name = name
        self.class_spec = class_spec
        self.field_defs = {}

    def __repr__(self):
        field_def_strs = [str(f) for f in self.field_defs.values()]
        return '<Definition {} ({}): {}>'.format(self.name, self.class_spec.name, ', '.join(field_def_strs))

    def freeze(self):
        for value in self.field_defs.values():
            value.freeze()
        self.field_defs = frozendict(self.field_defs)

    def compare(self, other_value):
        for field_name in self.field_defs.keys():
            if not self.field_defs[field_name].compare(other_value[field_name]):
                return False

        return self.field_defs.keys() == other_value.keys()


# {"person": "s", "gender": "f", "case": "v", "declension_category": "o"}
class FieldDefinition(CommonEqualityMixin):
    def __init__(self, field, value):
        self.field = field
        self.value = value

    def __repr__(self):
        value = "'{}'".format(self.value) if not self.field.value_type and self.field.collection_type == 'scalar' else self.value
        return '<FieldDefinition {}={}>'.format(self.field.name, value)

    def freeze(self):
        if self.field.value_type:
            if self.field.collection_type == 'set':
                for list_value in self.value:
                    list_value.freeze()
            else:
                self.value.freeze()

        if self.field.collection_type == 'set':
            self.value = tuple(self.value)

    def compare(self, other_value):
        if self.field.collection_type == 'set':
            for list_value in self.value:
                found = False
                for other_list_value in other_value:
                    found = list_value.compare(other_list_value) if self.field.value_type else list_value == other_list_value
                    if found:
                        break

                if not found:
                    return False

            return len(self.value) == len(other_value)
        else:
            return self.value.compare(other_value) if self.field.value_type else self.value == other_value


with open('schema.yaml') as f:
    schema = yaml.load(f)

classes = {}
definitions = defaultdict(lambda: {})

def print_classes():
    lines = []
    for class_spec in classes.values():
        lines.append('{}:'.format(class_spec.name))
        lines.append('  quiz_sets: {}'.format(class_spec.quiz_sets))
        lines.append('  fields:')
        for field in class_spec.fields.values():
            lines.append('    {}:'.format(field.name))
            lines.append('      value_type: {}'.format(field.value_type.name if field.value_type else 'literal'))
            lines.append('      collection_type: {}'.format(field.collection_type))
            lines.append('      determinative: {}'.format(field.determinative))
            lines.append('')

    print('\n'.join(lines))

def get_definition_tree_lines(definition):
    lines = []
    # print('get_definition_tree_lines', definition)
    lines.append('{} ({}):'.format(definition.name, definition.class_spec.name))
    for field_def in definition.field_defs.values():
        # print('field_def', field_def)
        if field_def.field.collection_type == 'scalar':
            if field_def.field.value_type:
                # lines.append('  {}:'.format(field_def))
                lines.extend(['  {}'.format(line) for line in get_definition_tree_lines(field_def.value)])
            else:
                lines.append('  {}: \'{}\''.format(field_def.field.name, field_def.value))
        else:
            lines.append('  {}:'.format(field_def.field.name))
            for list_value in field_def.value:
                if field_def.field.value_type:
                    lines.extend(['    {} {}'.format('-' if index == 0 else '', line) for index, line in enumerate(get_definition_tree_lines(list_value))])
                else:
                    lines.append('    - \'{}\''.format(list_value))

    return lines

def print_definition(definition):
    print('\n'.join(get_definition_tree_lines(definition)))

# def print_field_definition(field_def):
#     print('\n'.join(get_definition_tree_lines(field_def)))

def print_definitions():
    lines = []
    for class_definitions in definitions.values():
        for definition in class_definitions.values():
            print_definition(definition)
            print()


for class_name, class_data in schema.get('classes', {}).items():
    quiz_sets = class_data.get('quiz_sets', [])
    class_spec = Class(class_name, quiz_sets=quiz_sets)
    classes[class_name] = class_spec

for class_name, class_data in schema.get('classes', {}).items():
    class_spec = classes[class_name]

    for field_name, field_data in class_data.get('classes', {}).items():
        if not field_data:
            field_data = {}

        value_type_name = field_data.get('type', field_name)
        value_type = classes[value_type_name] if value_type_name != 'literal' else None
        collection_type = field_data.get('collection_type', 'scalar')
        determinative = field_data.get('determinative', True)

        field = Field(field_name, class_spec, value_type, collection_type, determinative)
        class_spec.fields[field_name] = field

print_classes()

def create_definition(class_name, definition_name, definition_data):
    print('create_definition', class_name, definition_name, definition_data)
    class_spec = classes[class_name]
    definition = Definition(definition_name, class_spec)

    if class_name not in definitions:
        definitions[class_name] = {}

    definitions[class_name][definition_name] = definition


def populate_definition(class_name, definition_name, definition_data):
    print('populate_definition', class_name, definition_name, definition_data)
    class_spec = classes[class_name]
    definition = definitions[class_name].get(definition_name)
    if not definition:
        definition = Definition(definition_name, class_spec)
        definitions[class_name][definition_name] = definition

    for field in class_spec.required_fields:
        if not definition_data.get(field.name):
            raise Exception('Missing field {} on {} definition named {}'.format(field.name, class_name, definition_name))

    for field in class_spec.fields.values():
        field_value = definition_data.get(field.name)
        print('\tgot field value {} for field {}'.format(field_value, field))

        def raise_bad_type(expected_type):
            raise Exception('Field {} of {} definition {} has type {}; {} expected'.format(field.name, class_name,
                definition_name, type(field_value), expected_type))

        if field_value:
            if type(field_value) == str:
                if field.value_type:
                    referenced_def = definitions[field.value_type.name][field_value]
                    definition.field_defs[field.name] = FieldDefinition(field, referenced_def)
                else:
                    definition.field_defs[field.name] = FieldDefinition(field, field_value)
            elif type(field_value) == dict:
                dict_value_name = '{}_{}'.format(definition_name, field.name)
                field_def = populate_definition(field.value_type.name, dict_value_name, field_value)
                definition.field_defs[field.name] = FieldDefinition(field, field_def)
            elif field.collection_type == 'set':
                if type(field_value) != list:
                    raise_bad_type('list')
                elif field.value_type:
                    print('\tset value type: {}'.format(field.value_type))
                    list_values = []
                    for index, list_value in enumerate(field_value):
                        list_value_name = '{}_{}_{}'.format(definition_name, field.name, index)
                        list_value = populate_definition(field.value_type.name, list_value_name, list_value)
                        list_values.append(list_value)

                    definition.field_defs[field.name] = FieldDefinition(field, tuple(list_values))
                else:
                    definition.field_defs[field.name] = FieldDefinition(field, field_value)
            print('\tcreated field def', definition.field_defs[field.name])

    return definition


for class_name, class_definitions in schema.get('definitions', {}).items():
    for definition_name, definition in class_definitions.items():
        create_definition(class_name, definition_name, definition)

print()
for class_name, class_definitions in schema.get('definitions', {}).items():
    print('Iterating over', class_name)
    pprint(class_definitions)
    print()
    for definition_name, definition in class_definitions.items():
        populate_definition(class_name, definition_name, definition)

print()


def resolve_value(resolve_field_name, definition, tab=0):
    print('\t' * tab, '|', resolve_field_name, definition)
    print()
    results = set()

    child_field_defs = [definition.field_defs[resolve_field_name]] if resolve_field_name in definition.field_defs else definition.field_defs.values()
    for child_field_def in child_field_defs:
        child_field = child_field_def.field

        if child_field.name == resolve_field_name:
            results.add(child_field_def)
        elif child_field.value_type:
            if child_field.collection_type == 'scalar':
                child_result = resolve_value(resolve_field_name, child_field_def.value, tab + 1)
            else:
                for child_field_list_value in child_field_def.value:
                    print('\t' * tab, '*', child_field_list_value)
                    print()
                    child_result = resolve_value(resolve_field_name, child_field_list_value, tab + 1)
            results.update(child_result)

    print('\t' * tab, '> results', results)
    print()
    return frozenset(results)


print()
base_cards = []
for class_name, class_data in classes.items():
    for quiz_set in class_data.quiz_sets:
        for definition_name, definition in definitions.get(class_name, {}).items():
            definition.freeze()
            print('RESOLVING TO FIELDS')
            to_dict = {quiz_field_name: resolve_value(quiz_field_name, definition)
                       for quiz_field_name in quiz_set['to']}

            print()
            print('RESOLVING FROM FIELDS')
            from_dict = {quiz_field_name: resolve_value(quiz_field_name, definition)
                         for quiz_field_name in quiz_set['from']}

            from_keys = list(from_dict.keys()) # consistent ordering
            from_values = [list(from_dict[key]) for key in from_keys]

            product = list(itertools.product(*from_values))
            for combination in product:
                card = {
                    'to': to_dict,
                    'from': dict(zip(from_keys, combination))
                }

                base_cards.append(card)

print()
print('BEFORE')
for card in base_cards:
    pprint(card)
    print()

# import sys
# sys.exit()

cards = []
unique_from_sets = set([frozendict(f['from']) for f in base_cards])

for from_set in unique_from_sets:
    print('from_set', from_set)
    print()
    card = {'from': from_set}
    to_set = set()

    for base_card in base_cards:
        if from_set == base_card['from']:
            to_set.add(frozendict(base_card['to']))

    card['to'] = to_set
    cards.append(card)

print('AFTER UNIQUE')
for card in cards:
    pprint(card)
    print()

for card in cards:
    to_keys = set()
    for to_dict in card['to']:
        to_keys.update(to_dict.keys())

    to_values = {to_key: set([to_dict[to_key] for to_dict in card['to']])
                 for to_key in to_keys}

    # more_than_one = sum([1 if len(t) != 1 else 0 for t in to_values.values()])
    # if more_than_one > 1:
    # card['to'] = set(frozendict({key: frozenset({value}) for key, value in answer.items()}) for answer in card['to'])
    # else:
    # card['to'] = {frozendict({key: frozenset(values) for key, values in to_values.items()})}

def compare_answer(answer, response):
    success = True
    result = {}
    for field_name in answer:
        try:
            field_answer = answer[field_name]
            if is_iterable(field_answer):
                field_result = all([list_value.compare(response[field_name]) for list_value in field_answer])
            else:
                field_result = field_answer.compare(response[field_name])
        except KeyError:
            field_result = None

        result[field_name] = field_result
        success = success and field_result

    return success, result


print('AFTER DIVISION')
for card in cards:
    print()
    print('from')
    print(card['from'])
    print()
    print('to')
    keys = list(list(card['to'])[0].keys())
    remaining_answers = set(card['to'])
    for i in range(len(remaining_answers)):
        response = {}
        for key in keys:
            field_response = input('{}: '.format(key)).strip()
            first_char = len(field_response) > 0 and field_response[0]
            is_json = first_char in ('[', '{')
            response[key] = json.loads(field_response) if is_json else field_response

        for answer in remaining_answers:
            comparison = compare_answer(answer, response)
            print('comparison', comparison)
            if comparison:
                remaining_answers.remove(answer)
                break

    for value in card['to']:
        print(value)
        print(list(value.keys()))
        print('------------')
        print()
    print('==================')
    # card = json.loads(json.dumps(card, cls=FrozenCollectionEncoder))
    # print(json.dumps(card, indent=4, ensure_ascii=False))
    # print()

    # for to_value in card['to']:
    #     for class_name, to_definitions in to_value.items():
    #         print('class_name', class_name, to_definitions)
    #         for d in to_definitions:
    #             print('>', json.dumps(resolve_fields(classes[class_name], d), indent=4))

print()
# print_definitions()

# for card in cards:
#     print('=================')
#     for from_key, from_data in card['from'].items():
#         print(from_key, from_data)
#         print()

#     for to_dict in card['to']:
#         print('-----------------')
#         for to_key, to_data in to_dict.items():
#             print(to_key, to_data)
#             answer = input('Answer: ')
#             print()

# queues = schema['queues']
# for queue in queues:


# for i in range(5):
#     queue = random.choice(queues)
#     print(queue)
