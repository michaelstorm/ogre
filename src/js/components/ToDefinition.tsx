import * as React from 'react';
import {Field, Definition, FieldDefinition} from './interfaces';
import DefinitionParser from './DefinitionParser';
import ToFieldDefinition from './ToFieldDefinition';

interface ToDefinitionProps {
  field: Field,
  value: Definition,
  isReadOnly: boolean,
  onValueChanged: (value: Definition) => void,
  onSubmit: () => void
};

export default class ToDefinition extends React.Component<ToDefinitionProps, {}> {
  static defaultProps = {
    onValueChanged: () => {}
  }

  onValuesChanged = (field_name: string, newValues: FieldDefinition) => {
    console.log('ToDefinition.onValuesChanged', field_name, newValues);
    const value = Object.assign({}, this.props.value);
    value.field_defs[field_name] = newValues;
    this.props.onValueChanged(value);
  };

  render() {
    const {field, value, isReadOnly} = this.props;
    const {field_defs} = value;

    if (field.value_type.response_parser === 'definition') {
      return <DefinitionParser onValuesChanged={this.onValuesChanged}
                               onSubmit={this.props.onSubmit}
                               isReadOnly={this.props.isReadOnly}
                               value={value} />
    }
    else {
      return Object.keys(field_defs).sort().map(field_name => (
        <ToFieldDefinition key={field_name}
                           onValuesChanged={newValues => this.onValuesChanged(field_name, newValues)}
                           onSubmit={this.props.onSubmit}
                           isReadOnly={this.props.isReadOnly}
                           isCorrect={false}
                           isIncorrect={false}
                           {...field_defs[field_name]} />
      ));
    }
  }
};
