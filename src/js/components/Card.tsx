import * as React from 'react';
import _ from 'lodash';

interface InputChangedEvent {
  target: {value: string}
};

class FromDefinition extends React.Component<Definition, {}> {
  render() {
    const {field_defs} = this.props;

    return Object.keys(field_defs).sort().map(key => (
      <FromFieldDefinition key={key} {...field_defs[key]} />
    ));
  }
};

class FromFieldDefinition extends React.Component<FieldDefinition, {}> {
  render() {
    const {field, values} = this.props;

    const renderedValue = values.map((v, index) => (
      typeof v === "string"
        ? v
        : (
          <FromDefinition key={index}
                          name={null}
                          class_spec={null}
                          field_defs={(v as Definition).field_defs} />
        )
    ));

    return (
      <div className="field-definition">
        <div className="key">{field.name}</div>
        <div className="value">{renderedValue}</div>
      </div>
    );
  }
};

interface ToDefinitionProps {
  field: Field,
  value: Definition,
  isReadOnly: boolean,
  onValueChanged: (value: Definition) => void,
  onSubmit: () => void
};

class ToDefinition extends React.Component<ToDefinitionProps, {}> {
  onValuesChanged = (field_name: string, newValues: FieldDefinition) => {
    console.log('ToDefinition.onValuesChanged', field_name, newValues);
    const value = Object.assign({}, this.props.value);
    value.field_defs[field_name] = newValues;
    this.props.onValueChanged(value);
  };

  render() {
    // console.log('ToDefinition', this.props);
    const {field, value, isReadOnly} = this.props;
    const {field_defs} = value;

    if (field.value_type.response_parser === 'definition') {
      return <DefinitionParser onValuesChanged={this.onValuesChanged}
                               onSubmit={this.props.onSubmit}
                               isReadOnly={this.props.isReadOnly}
                               field_defs={field_defs}
                               value={value}
                               name={null}
                               class_spec={null} />
    }
    else {
      return Object.keys(field_defs).sort().map(field_name => (
        <ToFieldDefinition key={field_name}
                           onValuesChanged={newValues => this.onValuesChanged(field_name, newValues)}
                           onSubmit={this.props.onSubmit}
                           isReadOnly={this.props.isReadOnly}
                           {...field_defs[field_name]} />
      ));
    }
  }
};

type DefinitionParserProps = Definition & {
  isReadOnly: boolean,
  onValuesChanged: (field_name: string, newValues: FieldDefinition) => void,
  onSubmit: () => void,
  value: Definition
};

class DefinitionParser extends React.Component<DefinitionParserProps, {}> {
  onTextChanged = (e: InputChangedEvent) => {
    const newValue = {};
    const groups = e.target.value.split(';').map(group => group.trim()).filter(group => group.length > 0).map(group => group.split(',').map(value => value.trim()).filter(value => value.length > 0));
    // console.log('input', groups);
    // this.props.onValuesChanged('english_translation', groups);
    // console.log('expected', this.englishTranslationToValue(this.props.value));
  };

  onKeyDown = e => {
    if (e.ctrlKey && e.keyCode == 13) {
      this.props.onSubmit();
    }
  };

  englishTranslationToValue = value => {
    return new Set(value.field_defs.english_group.values.map(this.englishGroupToValue));
  };

  englishGroupToValue = value => {
    return new Set(value.field_defs.english.values.map(this.englishToString));
  };

  englishToValue = value => {
    const {before_parens, literal, after_parens} = value.field_defs;
    return literal.values[0];
  };

  englishTranslationToString = value => {
    return value.field_defs.english_group.values.map(this.englishGroupToString).join('; ');
  };

  englishGroupToString = value => {
    return value.field_defs.english.values.map(this.englishToString).join(', ');
  };

  englishToString = value => {
    const {before_parens, literal, after_parens} = value.field_defs;
    const parts = [];
    if (before_parens) {
      parts.push(`(${before_parens.values[0]})`);
    }
    parts.push(literal.values[0]);
    if (after_parens) {
      parts.push(`(${after_parens.values[0]})`);
    }
    return parts.join(' ');
  };

  render() {
    const {value, isReadOnly} = this.props;
    if (isReadOnly) {
      return this.englishTranslationToString(value);
    }
    else {
      return <input type="text" onChange={this.onTextChanged} onKeyDown={this.onKeyDown} />;
    }
  }
}

type ToFieldDefinitionProps = FieldDefinition & {
  onValuesChanged?: (values: FieldDefinition) => void,
  onSubmit?: () => void,
  isCorrect?: boolean,
  isIncorrect?: boolean,
  isReadOnly?: boolean
};

class ToFieldDefinition extends React.Component<ToFieldDefinitionProps, {}> {
  modifyValuesArray = (modifyArray: (values: Array<Value>) => void) => {
    const values = modifyArray(this.props.values.slice());
    const props = Object.assign({}, this.props, {values});
    this.props.onValuesChanged(props);
  };

  onAddClicked = () => {
    this.modifyValuesArray((values: Array<Value>) => {
      const newValues = visit_to_field_definition(this.props as FieldDefinition).values;
      return values.concat(newValues);
    });
  };

  onRemoveClicked = (index: number) => {
    this.modifyValuesArray((values: Array<Value>) => {
      values.splice(index, 1);
      return values;
    });
  };

  onChanged = (index: number, newValue: Value) => {
    this.modifyValuesArray((values: Array<Value>) => {
      values[index] = newValue;
      return values;
    });
  };

  onTextChanged = (index: number, e: InputChangedEvent) => {
    this.onChanged(index, e.target.value);
  };

  onChildValueChanged = (index: number, childValue: Value) => {
    this.onChanged(index, childValue);
  };

  onKeyDown = e => {
    if (e.ctrlKey && e.keyCode == 13) {
      this.props.onSubmit();
    }
  };

  render() {
    const {field, values} = this.props;

    if (!field.determinative) {
      return null;
    }

    const className = this.props.isCorrect
      ? "correct"
      : this.props.isIncorrect
        ? "incorrect"
        : null;

    return (
      <div className="field-definition">
        {
          values.map((value, index) => {
            const renderedValue = field.value_type
              ? <ToDefinition value={value as Definition}
                              field={field}
                              onValueChanged={(childValue: Definition) => this.onChildValueChanged(index, childValue)}
                              onSubmit={this.props.onSubmit}
                              isReadOnly={this.props.isReadOnly} />
              : this.props.isReadOnly
                ? <span>{value}</span>
                : <input type="text" value={value as string} onChange={e => this.onTextChanged(index, e)} onKeyDown={this.onKeyDown} />;

            return (
              <div key={index} className={className}>
                {index === 0 && <button className="add" onClick={this.onAddClicked}>+</button>}
                {values.length > 1 && <button className="add" onClick={() => this.onRemoveClicked(index)}>-</button>}

                <div className="key">
                  {(field.display_name || (field.value_type && field.value_type.display_name)) || field.name}
                </div>
                <div className="value">{renderedValue}</div>
              </div>
            )
          })
        }
      </div>
    );
  }
};

function visit_definition_fields(values: Answer): Answer {
  const ret: Answer = {};
  Object.keys(values).forEach(key => {
    ret[key] = visit_to_field_definition(values[key]);
  });
  return ret;
}

function visit_to_field_definition(field_definition: FieldDefinition): FieldDefinition {
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

function get_determinative_fields(definition: Definition): {[field_name: string]: FieldDefinition} {
  const fields = {};
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

function check_definition_responses(answers: Array<Answer>, responses: Array<Answer>) {
  const correct_responses: Array<number> = [];

  const remaining_answers = {};
  answers.forEach((answer: Answer, index: number) => {
    remaining_answers[index] = answer;
  });

  const remaining_responses = {};
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

type Value = Definition | string;

interface Definition {
  name: string,
  class_spec: object,
  field_defs: {
    [field_name: string]: FieldDefinition
  }
}

interface Class {
  name: string,
  display_name: string,
  fields: {[field_name: string]: Field},
  quiz_sets: Array<object>,
  response_parser: string
}

interface Field {
  name: string,
  display_name: string,
  class_spec: Class,
  value_type: Class
  collection_type: string,
  determinative: boolean,
}

interface FieldDefinition {
  field: Field,
  values: Array<Value>
}

interface Answer {
  [field_name: string]: FieldDefinition
}

interface CardProps {
  data: {
    from: {
      [field_name: string]: Value
    },
    to: Array<Answer>,
    to_fields: Answer,
  }
}

interface CardState {
  correct_responses: Array<number>,
  incorrect_responses: {
    [index: number]: Answer
  },
  remaining_answers: {
    [index: number]: Answer
  },
  responses: Array<Answer>
}

export default class Card extends React.Component<CardProps, CardState> {
  constructor(props) {
    super(props);

    const initial_response: Answer = visit_definition_fields(JSON.parse(JSON.stringify(props.data.to[0])));
    this.state = {
      responses: [initial_response],
      correct_responses: [],
      incorrect_responses: {},
      remaining_answers: {}
    };
  }

  componentDidMount() {
    setTimeout(() => {
      (document.querySelector('input[type="text"]') as HTMLElement).focus();
    }, 100);
  }

  onAddClicked = () => {
    this.setState(state => {
      const responses = state.responses.slice();
      responses.push(visit_definition_fields(this.props.data.to_fields));
      return {responses};
    });
  };

  onResponsesChanged = (index: number, name: string, values: FieldDefinition) => {
    this.setState(state => {
      const responses = state.responses.slice();
      const response = Object.assign({}, responses[index]);
      response[name] = values;
      responses[index] = response;
      return {responses};
    });
  };

  onSubmit = () => {
    console.log('onSubmit', this.state.responses);
    const {
      correct_responses,
      remaining_answers,
      remaining_responses
    } = check_definition_responses(this.props.data.to, this.state.responses);

    this.setState({
      correct_responses,
      incorrect_responses: remaining_responses,
      remaining_answers
    });
  };

  render() {
    const from_data = this.props.data.from;
    const {
      correct_responses,
      incorrect_responses,
      remaining_answers,
      responses
    } = this.state;

    return (
      <div className="card">
        <div className="from-fields">
          {
            Object.keys(from_data).sort().map(key => (
              <div className="field-definition" key={key}>
                <div className="key">{key}</div>
                <div className="value">
                  {
                    typeof from_data[key] === "string"
                      ? from_data[key]
                      : <FromDefinition {...(from_data[key] as Definition)} />
                  }
                </div>
              </div>
            ))
          }
        </div>
        <div className="to-fields">
          <div className="to-fields-column">
            <button className="add" onClick={this.onAddClicked}>+</button>
          </div>
          <div className="to-fields-column">
            {
              responses.map((response: Answer, i: number) => (
                <div className="response" key={i}>
                  {
                    Object.keys(response).sort().map((field_name: string) => {
                      const isCorrect = correct_responses.indexOf(i) > -1;
                      const isIncorrect = incorrect_responses[i] !== undefined;
                      return (
                          <ToFieldDefinition key={`${i}:${field_name}`}
                                             onValuesChanged={values => this.onResponsesChanged(i, field_name, values)}
                                             onSubmit={this.onSubmit}
                                             {...response[field_name]}
                                             isCorrect={isCorrect}
                                             isIncorrect={isIncorrect}
                                             isReadOnly={false} />
                      )
                    })
                  }
                </div>
              ))
            }
            {
              Object.values(remaining_answers).map((response: Answer, i: number) => (
                <div className="response" key={i}>
                  {
                    Object.keys(response).sort().map((field_name: string) => (
                        <ToFieldDefinition key={`${i}:${field_name}`}
                                           {...response[field_name]}
                                           isReadOnly={true} />
                    ))
                  }
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  }
};
