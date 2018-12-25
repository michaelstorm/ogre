import * as React from 'react';
import FromFieldDefinition from './FromFieldDefinition';
import {FieldDefinition} from './interfaces';

interface FromDefinitionProps {
  field_defs: {
    [field_name: string]: FieldDefinition
  }
}

export default class FromDefinition extends React.Component<FromDefinitionProps, {}> {
  render() {
    const {field_defs} = this.props;

    return Object.keys(field_defs).sort().map(key => (
      <FromFieldDefinition key={key} {...field_defs[key]} />
    ));
  }
};
