import React, { Component } from 'react';
import _ from 'lodash';

class FromDefinition extends Component {
  render() {
    const {field_defs} = this.props;

    return Object.keys(field_defs).map(key => (
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
    const value = Object.assign({}, this.props.value);
    value.field_defs[field_name] = newValues;
    this.props.onValueChanged(value);
  };

  render() {
    // console.log('ToDefinition', this.props);
    const {value} = this.props;
    const {field_defs} = value;

    return Object.keys(field_defs).map(field_name => (
      <ToFieldDefinition key={field_name}
                         onValuesChanged={newValues => this.onValuesChanged(field_name, newValues)}
                         onSubmit={this.props.onSubmit}
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
    this.onChanged(index, childValue);
  };

  onKeyDown = e => {
    if (e.ctrlKey && e.keyCode == 13) {
      this.props.onSubmit();
    }
  };

  render() {
    const {field, values} = this.props;

    return (
      <div className="field-definition">
        {
          values.map((value, index) => (
            <div key={index}>
              {index === 0 && <button className="add" onClick={this.onAddClicked}>+</button>}
              {values.length > 1 && <button className="add" onClick={() => this.onRemoveClicked(index)}>-</button>}

              <div className="key">
                {(field.display_name || (field.value_type && field.value_type.display_name)) || field.name}
              </div>
              <div className="value">
                {
                  !field.value_type
                    ? <input type="text" value={value} onChange={e => this.onTextChanged(index, e)} onKeyDown={this.onKeyDown} />
                    : <ToDefinition value={value}
                                    onValueChanged={childValue => this.onChildValueChanged(index, childValue)}
                                    onSubmit={this.props.onSubmit} />
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
  field_definition = Object.assign({}, field_definition);
  field_definition.expected_values = field_definition.values;

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

function check_def(answer, response) {
  console.log('check_def', answer, response);
}

function check_definition_response(answer, response) {
  return Object.keys(answer).map(key => {
    const answer_field = answer[key];
    const answer_values = answer_field.values;
    console.log('answer_values', answer_values);

    const response_field = response[key];
    const response_values = response_field.values;
    console.log('response_values', response_values);

    const max_attempts = answer_values.length;
    return check_def(answer_values, response_values);
  });
}

export default class Card extends Component {
  constructor(props) {
    super(props);

    const initial_response = visit_definition_fields(JSON.parse(JSON.stringify(props.data.to[0])));
    this.state = {responses: [initial_response]};
  }

  onAddClicked = () => {
    this.setState(state => {
      const responses = state.responses.slice();
      responses.push(visit_definition_fields(this.props.data.to_fields));
      return {responses};
    });
  };

  onResponsesChanged = (index, name, values) => {
    this.setState(state => {
      const responses = state.responses.slice();
      const response = Object.assign({}, responses[index]);
      response[name] = values;
      responses[index] = response;
      return {responses};
    });
  };

  onSubmit = () => {
    check_definition_response(this.props.data.to[0], this.state.responses[0]);
  };

  render() {
    console.log('this.state', this.state);

    const from_data = this.props.data.from;
    const {responses} = this.state;

    return (
      <div className="card">
        <div className="from-fields">
          {
            Object.keys(from_data).map(key => (
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
              responses.map((response, i) => (
                Object.keys(response).map(field_name => (
                    <ToFieldDefinition key={`${i}:${field_name}`}
                                       onValuesChanged={values => this.onResponsesChanged(i, field_name, values)}
                                       onSubmit={this.onSubmit}
                                       {...response[field_name]} />
                ))
              ))
            }
          </div>
        </div>
      </div>
    );
  }
};
