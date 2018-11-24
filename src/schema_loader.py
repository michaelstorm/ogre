import yaml

from schema import Class, Definition, Field, FieldDefinition


def create_classes(classes, schema):
    for class_name, class_data in schema.get('classes', {}).items():
        quiz_sets = class_data.get('quiz_sets', [])
        class_spec = Class(class_name, display_name=class_data.get('display_name'), quiz_sets=quiz_sets)
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

            field = Field(field_name, class_spec, value_type, collection_type, determinative,
                          display_name=field_data.get('display_name'))
            class_spec.fields[field_name] = field


def get_or_create_definition(definitions, class_spec, definition_name):
    class_name = class_spec.name
    definition = definitions[class_name].get(definition_name)
    if not definition:
        definition = Definition(definition_name, class_spec)
        definitions[class_name][definition_name] = definition

    return definition


def check_field_definition_type(definition_name, field, field_value):
    expected_type = None
    if field_value != None:
        if field.collection_type == 'set' and type(field_value) != list:
            expected_type = 'list'
        elif field.collection_type != 'set' and type(field_value) == list:
            expected_type = 'str or dict'

    if expected_type:
        raise Exception('Field {} of {} definition {} has type {}; {} expected'.format(
            field.name, field.class_spec.name, definition_name, type(field_value), expected_type))


def create_field_definition_from_str(definitions, definition, field, field_value):
    field_def_value = field_value
    if field.value_type:
        # derefence definition name if it's not a literal
        field_def_value = get_or_create_definition(definitions, field.value_type, field_value)

    return FieldDefinition(field, tuple([field_def_value]))


def create_field_definition_from_dict(definitions, definition, field, field_value):
    dict_value_name = '{}_{}'.format(definition.name, field.name)
    field_def = populate_definition(field.value_type, definitions, dict_value_name, field_value)
    return FieldDefinition(field, tuple([field_def]))


def create_field_definition_from_set(definitions, definition, field, field_value):
    if field.value_type:
        list_values = []
        for index, list_value in enumerate(field_value):
            list_value_name = '{}_{}_{}'.format(definition.name, field.name, index)
            list_value = populate_definition(field.value_type, definitions, list_value_name, list_value)
            list_values.append(list_value)

        return FieldDefinition(field, tuple(list_values))
    else:
        return FieldDefinition(field, tuple(field_value))


def create_field_definition(definitions, definition, field, field_value):
    check_field_definition_type(definition.name, field, field_value)

    field_def = None
    if type(field_value) == str:
        field_def = create_field_definition_from_str(definitions, definition, field, field_value)

    elif type(field_value) == dict:
        field_def = create_field_definition_from_dict(definitions, definition, field, field_value)

    elif field.collection_type == 'set':
        field_def = create_field_definition_from_set(definitions, definition, field, field_value)

    definition.field_defs[field.name] = field_def


def populate_definition(class_spec, definitions, definition_name, definition_data):
    class_name = class_spec.name
    definition = get_or_create_definition(definitions, class_spec, definition_name)

    # check for existence of required fields
    for field in class_spec.required_fields:
        if not definition_data.get(field.name):
            raise Exception('Missing field {} on {} definition named {}'.format(field.name, class_name, definition_name))

    for field in class_spec.fields.values():
        field_value = definition_data.get(field.name)
        if field_value:
            create_field_definition(definitions, definition, field, field_value)

    return definition


def create_definitions_from_schema(classes, definitions, schema):
    schema_definitions = schema.get('definitions', {})
    for class_name, class_definitions_data in schema_definitions.items():
        class_spec = classes[class_name]
        for definition_name, definition_data in class_definitions_data.items():
            definition = populate_definition(class_spec, definitions, definition_name, definition_data)


def freeze_definitions(definitions):
    for class_definitions in definitions.values():
        for definition in class_definitions.values():
            definition.freeze()


def open_schema_file(path):
    with open(path) as f:
        return yaml.load(f)
