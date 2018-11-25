from frozendict import frozendict
import json


class FrozenCollectionEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, frozenset) or isinstance(obj, set):
            return [self.default(x) for x in obj]

        elif isinstance(obj, frozendict):
            return {x: self.default(y) for x, y in obj.items()}

        elif isinstance(obj, Class):
            return {key: value for key, value in obj.__dict__.items() if key != 'fields'}

        elif isinstance(obj, FieldDefinition) or isinstance(obj, Field) or isinstance(obj, Definition):
            return obj.__dict__ # not sure why returning __dict__ sidesteps circular reference

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
    def __init__(self, name, display_name=None, quiz_sets=[]):
        self.name = name
        self.display_name = display_name
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
    def __init__(self, name, class_spec, value_type, collection_type, determinative, display_name=None):
        self.name = name
        self.display_name = display_name
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
            if not other_value or not self.field_defs[field_name].compare(other_value[field_name]):
                return False

        return self.field_defs.keys() == other_value.keys()


# {"person": "s", "gender": "f", "case": "v", "declension_category": "o"}
class FieldDefinition(CommonEqualityMixin):
    def __init__(self, field, values):
        self.field = field
        self.values = values

    def __repr__(self):
        return '<FieldDefinition {}={}>'.format(self.field.name, self.values)

    def freeze(self):
        if self.field.value_type:
            for list_value in self.values:
                list_value.freeze()

        self.values = tuple(self.values)

    def compare(self, other_value):
        if self.field.collection_type == 'set':
            for list_value in self.values:
                found = False
                for other_list_value in other_value:
                    found = list_value.compare(other_list_value) if self.field.value_type else list_value == other_list_value
                    if found:
                        break

                if not found:
                    return False

            return len(self.values) == len(other_value)
        else:
            return self.values.compare(other_value) if self.field.value_type else self.values == other_value


def print_classes(classes):
    lines = []
    for class_spec in classes.values():
        lines.append('{}:'.format(class_spec.name))
        lines.append('  display_name: "{}"'.format(class_spec.display_name))
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


def print_definitions():
    lines = []
    for class_definitions in definitions.values():
        for definition in class_definitions.values():
            print_definition(definition)
            print()
