import React, { Component } from 'react';
import _ from 'lodash';

class FromDefinition extends Component {
  render() {
    // console.log('FromDefinition', this.props);
    const {field_defs} = this.props;

    return Object.keys(field_defs).map(key => {
      return <FromFieldDefinition key={key} {...field_defs[key]} />;
    });
  }
};

class FromFieldDefinition extends Component {
  render() {
    // console.log('FromFieldDefinition', this.props);
    const {field, values} = this.props;

    const renderedValue = values.map((v, index) => {
      return typeof v === "string"
        ? v
        : <FromDefinition key={index} field_defs={v.field_defs} />;
    });

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

    return Object.keys(field_defs).map(field_name => {
      return <ToFieldDefinition key={field_name}
                                onValuesChanged={newValues => this.onValuesChanged(field_name, newValues)}
                                onSubmit={this.props.onSubmit}
                                {...field_defs[field_name]} />;
    });
  }
};

class ToFieldDefinition extends Component {
  modifyValuesArray = modifyArray => {
    console.log('modifyValuesArray', this.props);
    const props = Object.assign({}, this.props);
    const values = props.values.slice();
    props.values = modifyArray(values);
    console.log('new props', props);
    this.props.onValuesChanged(props);
  };

  onAddClicked = () => {
    this.modifyValuesArray(values => {
      console.log('MOD', values);
      const newValues = visit_to_field_definition(this.props).values;
      console.log('newValues', newValues);
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
    console.log('onChildValueChanged', index, childValue);
    this.onChanged(index, childValue);
  };

  onKeyDown = e => {
    if (e.ctrlKey && e.keyCode == 13) {
      this.props.onSubmit();
    }
  };

  render() {
    // console.log('ToFieldDefinition', this.props);
    const {field, values} = this.props;

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
                <div className="key">{(this.props.display_name || (field.value_type && field.value_type.display_name)) || field.name}</div>
                <div className="value">
                  {
                    !field.value_type_name
                      ? <input type="text" value={value} onChange={e => this.onTextChanged(index, e)} onKeyDown={this.onKeyDown} />
                      : <ToDefinition value={value}
                                      onValueChanged={childValue => this.onChildValueChanged(index, childValue)}
                                      onSubmit={this.props.onSubmit} />
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

function visit_definition_fields(values) {
  // console.log('visit_definition_fields', values);
  const ret = {};
  Object.keys(values).forEach(key => {
    ret[key] = visit_to_field_definition(values[key]);
  });
  return ret;
}

function visit_to_field_definition(field_definition) {
  // console.log('visit_to_field_definition', field_definition);
  field_definition = Object.assign({}, field_definition);
  field_definition.values = field_definition.field.value_type_name ? [Object.assign({}, field_definition.values[0], {field_defs: visit_definition_fields(field_definition.values[0].field_defs)})] : [''];
  return field_definition;
}

function check_definition_response(answer, response) {
  console.log('check_definition_response', answer, response);
  Object.keys(answer).forEach(key => {
    const answer_field = answer[key];
    console.log('answer_field', answer_field);
    const answer_values = answer_field.map(f => f.values);

    const response_field = response[key];
    console.log('response_field', response_field);

    // console.log(answer_values, response[key]);
    const max_attempts = answer_values.length;

    // for (let attempts = 0; attempts < max_attempts; attempts++) {
    //   for (let i = 0; i < answer_values.length; i++) {
    //     if (typeof answer_values[i] === 'object') {
    //       if (check_definition_response(answer_values[i].field_defs, response[key])) {
    //         console.log(answer_values[i].field_defs, response[key], 'equal');
    //       }
    //     }
    //   }
    // }
  });
}

export default class Card extends Component {
  constructor(props) {
    super(props);

    this.state = {responses: [visit_definition_fields(JSON.parse(JSON.stringify(props.data.to[0])))]};
    console.log('this.state', this.state);
    // console.log(visit_definition_fields(this.state.responses[0]))
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
      console.log('onResponsesChanged', state, index, name, values);
      const responses = state.responses.slice();
      const response = Object.assign({}, responses[index]);
      response[name] = values;
      responses[index] = response;
      return {responses};
    });
  };

  onSubmit = () => {
    // console.log(this.state.responses);
    check_definition_response(this.props.data.to[0], this.state.responses[0]);
  };

  render() {
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
              responses.map((response, i) => {
                return Object.keys(response).map(field_name => {
                  return (
                    <ToFieldDefinition key={`${i}:${field_name}`}
                                       onValuesChanged={values => this.onResponsesChanged(i, field_name, values)}
                                       onSubmit={this.onSubmit}
                                       {...response[field_name]} />
                  )
                })
              })
            }
          </div>
        </div>
      </div>
    );
  }
};
