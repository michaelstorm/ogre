export type Value = Definition | string;

export interface Definition {
  name: string,
  class_spec: object,
  field_defs: {
    [field_name: string]: FieldDefinition
  }
}

export interface Class {
  name: string,
  display_name: string,
  fields: {[field_name: string]: Field},
  quiz_sets: Array<object>,
  response_parser: string
}

export interface Field {
  name: string,
  display_name: string,
  class_spec: Class,
  value_type: Class
  collection_type: string,
  determinative: boolean,
}

export interface FieldDefinition {
  field: Field,
  values: Array<Value>
}

export interface Answer {
  [field_name: string]: FieldDefinition
}

export interface CardProps {
  from: {
    [field_name: string]: Value
  },
  to: Array<Answer>,
  to_fields: Answer
}

export interface InputChangedEvent {
  target: {value: string}
}

export interface KeyDownEvent {
  ctrlKey: boolean,
  keyCode: number
}
