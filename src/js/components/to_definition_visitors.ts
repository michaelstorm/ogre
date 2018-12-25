import {Answer, Definition, FieldDefinition} from './interfaces';

export function visit_definition_fields(values: Answer): Answer {
  const ret: Answer = {};
  Object.keys(values).forEach(key => {
    ret[key] = visit_to_field_definition(values[key]);
  });
  return ret;
}

export function visit_to_field_definition(field_definition: FieldDefinition): FieldDefinition {
  field_definition = JSON.parse(JSON.stringify(field_definition));
  const {value_type} = field_definition.field;

  if (value_type) {
    const first_value: Definition = field_definition.values[0] as Definition;
    const field_defs = visit_definition_fields(first_value.field_defs);
    field_definition.values = [Object.assign({}, first_value, {field_defs})];
  }
  else {
    field_definition.values = [''];
  }

  return field_definition;
}
