import {Answer, Definition, FieldDefinition, Value} from './interfaces';

function get_determinative_fields(definition: Definition): {[field_name: string]: FieldDefinition} {
  const fields: {[field_name: string]: FieldDefinition} = {};
  Object.keys(definition.field_defs).forEach(field_name => {
    const answer_field = definition.field_defs[field_name];
    if (answer_field.field.determinative) {
      fields[field_name] = answer_field;
    }
  });
  return fields;
}

function compare_values(answer_value: Value, response_value: Value): boolean {
  console.log('compare_values', answer_value, response_value);
  if (typeof answer_value === "string") {
    console.log('string equals:', answer_value === response_value);
    return (answer_value as string).trim() === (response_value as string).trim();
  }
  else {
    const answer_fields = get_determinative_fields(answer_value as Definition);
    const response_fields = get_determinative_fields(response_value as Definition);
    console.log('fields', answer_fields, response_fields);

    if (JSON.stringify(Object.keys(answer_fields).sort()) !== JSON.stringify(Object.keys(response_fields).sort())) {
      return false;
    }
    else {
      return Object.keys(answer_fields).every(field_name => {
        const answer_field = answer_fields[field_name];
        const response_field = response_fields[field_name];

        if (answer_field.field.determinative) {
          return check_def(answer_field.values, response_field.values);
        }
        else {
          return true;
        }
      });
    }
  }
}

function check_def(answer_values: Array<Value>, response_values: Array<Value>): boolean {
  console.log('check_def', answer_values, response_values);
  const result = answer_values.every(answer_value => {
    const r = response_values.find(response_value => compare_values(answer_value, response_value)) !== undefined;
    if (!r) {
      console.log("couldn't match", answer_value, "against", response_values);
    }
    return r;
  });
  console.log('check_def result', answer_values, response_values, result);
  return result;
}

function check_definition_response(answer: Answer, response: Answer): boolean {
  return Object.keys(answer).every(key => {
    const answer_field = answer[key];
    const answer_values = answer_field.values;

    const response_field = response[key];
    const response_values = response_field.values;

    return check_def(answer_values, response_values);
  });
}

export function check_definition_responses(answers: Array<Answer>, responses: Array<Answer>) {
  const correct_responses: Array<number> = [];

  const remaining_answers: {[index: number]: Answer} = {};
  answers.forEach((answer: Answer, index: number) => {
    remaining_answers[index] = answer;
  });

  const remaining_responses: {[index: number]: Answer} = {};
  responses.forEach((response: Answer, index: number) => {
    remaining_responses[index] = response;
  });

  responses.forEach((response: Answer, responseIndex: number) => {
    const found_answer_index = answers.findIndex((answer: Answer) => check_definition_response(answer, response));
    if (found_answer_index > -1) {
      correct_responses.push(found_answer_index);
      delete remaining_answers[found_answer_index];
      delete remaining_responses[responseIndex];
    }
  });

  return {correct_responses, remaining_answers, remaining_responses};
}
