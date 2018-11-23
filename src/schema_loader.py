from collections import defaultdict
from frozendict import frozendict
from pprint import pprint
import itertools
import json
import yaml

from helpers import is_iterable
from schema import Class, Definition, Field, FieldDefinition, print_classes


with open('data/schema.yaml') as f:
    schema = yaml.load(f)


classes = {}
definitions = defaultdict(lambda: {})


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

print_classes(classes)

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
