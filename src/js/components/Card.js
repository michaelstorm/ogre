import React, { Component } from 'react';
import _ from 'lodash';

class FromDefinition extends Component {
  render() {
    const {field_defs} = this.props;

    return Object.keys(field_defs).map(key => {
      return <FromFieldDefinition key={key} {...field_defs[key]} />;
    });
  }
};

class FromFieldDefinition extends Component {
  render() {
    const {field, value} = this.props;

    const renderedValue = typeof value === "string"
      ? value
      : Array.isArray(value)
        ? value.map((v, index) => {
            return <FromDefinition key={index} field_defs={v.field_defs} />;
          })
        : <FromDefinition field_defs={value.field_defs} />;

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
    value[field_name] = newValues;
    this.props.onValueChanged(value);
  };

  render() {
    const {value} = this.props;

    return Object.keys(value).map(field_name => {
      return <ToFieldDefinition key={field_name}
                                onValuesChanged={newValues => this.onValuesChanged(field_name, newValues)}
                                {...value[field_name]} />;
    });
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
      const field_definition = visit_to_field_definition(this.props);
      return values.concat(field_definition.values);
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
  }

  onTextChanged = (index, e) => {
    this.onChanged(index, e.target.value);
  };

  onChildValueChanged = (index, childValue) => {
    this.onChanged(index, childValue);
  }

  render() {
    const {determinative, name, value_type, values} = this.props;

    return (
      <div className="field-definition">
        {
          values.map((value, index) => {
            return (
              <div key={index}>
                <button className="add" onClick={this.onAddClicked}>+</button>
                {
                  values.length > 1 && <button className="add" onClick={() => this.onRemoveClicked(index)}>-</button>
                }
                <div className="key">{name}</div>
                <div className="value">
                  {
                    !value_type
                      ? <input type="text" value={value} onChange={e => this.onTextChanged(index, e)} />
                      : <ToDefinition value={value} onValueChanged={childValue => this.onChildValueChanged(index, childValue)} />
                  }
                </div>
              </div>
            );
          })
        }
      </div>
    );
  }
};

function visit_definition_fields(fields) {
  const ret = {};
  Object.keys(fields).forEach(key => {
    ret[key] = visit_to_field_definition(fields[key]);
  });
  return ret;
}

function visit_to_field_definition(field_definition) {
  field_definition = Object.assign({}, field_definition);
  field_definition.values = field_definition.value_type ? [visit_definition_fields(field_definition.value_type.fields)] : [''];
  return field_definition;
}

export default class Card extends Component {
  constructor(props) {
    super(props);

    this.state = {responses: visit_definition_fields(props.data.to_fields)};
  }

  onResponsesChanged = (name, values) => {
    this.setState(state => {
      const responses = Object.assign({}, state.responses);
      responses[name] = values;
      return {responses};
    });
  };

  render() {
    const from_data = this.props.data.from;
    const {responses} = this.state;

    return (
      <div className="card">
        <div className="from-fields">
          {
            Object.keys(from_data).map(key => (
              <FromFieldDefinition key={key} {...from_data[key]} />
            ))
          }
        </div>
        <div className="to-fields">
          <div className="to-fields-column">
            <button className="add">+</button>
          </div>
          <div className="to-fields-column">
            {
              Object.keys(responses).map(field_name => {
                return (
                  <ToFieldDefinition key={field_name}
                                     onValuesChanged={values => this.onResponsesChanged(field_name, values)}
                                     {...responses[field_name]} />
                )
              })
            }
          </div>
        </div>
      </div>
    );
  }
};
