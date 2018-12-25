import * as React from 'react';
import FromDefinition from './FromDefinition';
import {Definition, Field, Value} from './interfaces';

interface FromFieldDefinitionProps {
  field: Field,
  values: Array<Value>
}

export default class FromFieldDefinition extends React.Component<FromFieldDefinitionProps, {}> {
  render() {
    const {field, values} = this.props;

    const renderedValue = values.map((v, index) => (
      typeof v === "string"
        ? v
        : (
          <FromDefinition key={index} field_defs={(v as Definition).field_defs} />
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
