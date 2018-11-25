import React, { Component } from 'react';
import _ from 'lodash';

class FromDefinition extends Component {
  render() {
    const {field_defs} = this.props;

    return Object.keys(field_defs).sort().map(key => (
      <FromFieldDefinition key={key} {...field_defs[key]} />
    ));
  }
};

class FromFieldDefinition extends Component {
  render() {
    const {field, values} = this.props;

    const renderedValue = values.map((v, index) => (
      typeof v === "string"
        ? v
        : <FromDefinition key={index} field_defs={v.field_defs} />
    ));

    return (
      <div className="field-definition">
        <div className="key">{field.name}</div>
        <div className="value">{renderedValue}</div>
      </div>
    );
  }
};

class ToDefinition extends Component {
  onValuesChanged = (field_name, newValues) => {
    // console.log('ToDefinition.onValuesChanged', field_name, newValues);
    const value = Object.assign({}, this.props.value);
    value.field_defs[field_name] = newValues;
    this.props.onValueChanged(value);
  };

  render() {
    // console.log('ToDefinition', this.props);
    const {value} = this.props;
    const {field_defs} = value;

    return Object.keys(field_defs).sort().map(field_name => (
      <ToFieldDefinition key={field_name}
                         onValuesChanged={newValues => this.onValuesChanged(field_name, newValues)}
                         onSubmit={this.props.onSubmit}
                         isReadOnly={this.props.isReadOnly}
                         {...field_defs[field_name]} />
    ));
  }
};

class ToFieldDefinition extends Component {
  modifyValuesArray = modifyArray => {
    const props = Object.assign({}, this.props);
    const values = props.values.slice();
    props.values = modifyArray(values);
    this.props.onValuesChanged(props);
  };

  onAddClicked = () => {
    this.modifyValuesArray(values => {
      const newValues = visit_to_field_definition(this.props).values;
      return values.concat(newValues);
    });
  };

  onRemoveClicked = index => {
    this.modifyValuesArray(values => {
      values.splice(index, 1);
      return values;
    });
  };

  onChanged = (index, newValue) => {
    this.modifyValuesArray(values => {
      values[index] = newValue;
      return values;
    });
  };

  onTextChanged = (index, e) => {
    this.onChanged(index, e.target.value);
  };

  onChildValueChanged = (index, childValue) => {
    // console.log('onChildValueChanged', index, childValue);
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
          values.map((value, index) => (
            <div key={index} className={className}>
              {index === 0 && <button className="add" onClick={this.onAddClicked}>+</button>}
              {values.length > 1 && <button className="add" onClick={() => this.onRemoveClicked(index)}>-</button>}

              <div className="key">
                {(field.display_name || (field.value_type && field.value_type.display_name)) || field.name}
              </div>
              <div className="value">
                {
                  field.value_type
                    ? <ToDefinition value={value}
                                    onValueChanged={childValue => this.onChildValueChanged(index, childValue)}
                                    onSubmit={this.props.onSubmit}
                                    isReadOnly={this.props.isReadOnly} />
                    : this.props.isReadOnly
                      ? <span>{value}</span>
                      : <input type="text" value={value} onChange={e => this.onTextChanged(index, e)} onKeyDown={this.onKeyDown} />
                }
              </div>
            </div>
          ))
        }
      </div>
    );
  }
};

function visit_definition_fields(values) {
  const ret = {};
  Object.keys(values).forEach(key => {
    ret[key] = visit_to_field_definition(values[key]);
  });
  return ret;
}

function visit_to_field_definition(field_definition) {
  field_definition = JSON.parse(JSON.stringify(field_definition));
  const {value_type} = field_definition.field;

  if (value_type) {
    const first_value = field_definition.values[0];
    const field_defs = visit_definition_fields(first_value.field_defs);
    field_definition.values = [Object.assign({}, first_value, {field_defs})];
  }
  else {
    field_definition.values = [''];
  }

  return field_definition;
}

function compare_values(answer_value, response_value) {
  console.log('compare_values', answer_value, response_value);
  if (typeof answer_value === "string") {
    console.log('string equals:', answer_value === response_value);
    return answer_value.trim() === response_value.trim();
  }
  else {
    const answer_fields = {};
    Object.keys(answer_value.field_defs).forEach(field_name => {
      const answer_field = answer_value.field_defs[field_name];
      if (answer_field.field.determinative) {
        answer_fields[field_name] = answer_field;
      }
    });

    const response_fields = {};
    Object.keys(response_value.field_defs).forEach(field_name => {
      const response_field = response_value.field_defs[field_name];
      if (response_field.field.determinative) {
        response_fields[field_name] = response_field;
      }
    });
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

function check_def(answer_values, response_values) {
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

function check_definition_response(answer, response) {
  return Object.keys(answer).every(key => {
    const answer_field = answer[key];
    const answer_values = answer_field.values;

    const response_field = response[key];
    const response_values = response_field.values;

    return check_def(answer_values, response_values);
  });
}

function check_definition_responses(answers, responses) {
  const correct_responses = [];

  const remaining_answers = {};
  answers.forEach((answer, index) => {
    remaining_answers[index] = answer;
  });

  const remaining_responses = {};
  responses.forEach((response, index) => {
    remaining_responses[index] = response;
  });

  responses.forEach((response, responseIndex) => {
    const found_answer_index = answers.findIndex(answer => check_definition_response(answer, response));
    if (found_answer_index > -1) {
      correct_responses.push(found_answer_index);
      delete remaining_answers[found_answer_index];
      delete remaining_responses[responseIndex];
    }
  });

  return {correct_responses, remaining_answers, remaining_responses};
}

export default class Card extends Component {
  constructor(props) {
    super(props);

    const initial_response = visit_definition_fields(JSON.parse(JSON.stringify(props.data.to[0])));
    this.state = {responses: [initial_response], correct_responses: [], incorrect_responses: {}, remaining_answers: {}};
  }

  componentDidMount() {
    setTimeout(() => {
      document.querySelector('input[type="text"]').focus();
    }, 100);
  }

  onAddClicked = () => {
    this.setState(state => {
      const responses = state.responses.slice();
      responses.push(visit_definition_fields(this.props.data.to_fields));
      return {responses};
    });
  };

  onResponsesChanged = (index, name, values) => {
    // console.log('Card.onResponsesChanged', index, name, values);
    this.setState(state => {
      const responses = state.responses.slice();
      const response = Object.assign({}, responses[index]);
      response[name] = values;
      responses[index] = response;
      return {responses};
    });
  };

  onSubmit = () => {
    const {correct_responses, remaining_answers, remaining_responses} = check_definition_responses(this.props.data.to, this.state.responses);
    this.setState({correct_responses, incorrect_responses: remaining_responses, remaining_answers});
  };

  render() {
    console.log('this.state', this.state);

    const from_data = this.props.data.from;
    const {correct_responses, incorrect_responses, remaining_answers, responses} = this.state;

    return (
      <div className="card">
        <div className="from-fields">
          {
            Object.keys(from_data).sort().map(key => (
              <div className="field-definition" key={key}>
                <div className="key">{key}</div>
                <div className="value"><FromDefinition {...from_data[key]} /></div>
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
              responses.map((response, i) => {
                return (
                  Object.keys(response).sort().map(field_name => {
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
                )
              })
            }
            {
              Object.values(remaining_answers).map((response, i) => {
                return (
                  Object.keys(response).sort().map(field_name => {
                    return (
                      <ToFieldDefinition key={`${i}:${field_name}`}
                                         {...response[field_name]}
                                         isReadOnly={true} />
                    )
                  })
                )
              })
            }
          </div>
        </div>
      </div>
    );
  }
};
