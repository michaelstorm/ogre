import * as React from 'react';
import {Definition, FieldDefinition, KeyDownEvent, InputChangedEvent, Value} from './interfaces';

type DefinitionParserProps = {
  isReadOnly: boolean,
  onValuesChanged: (field_name: string, newValues: FieldDefinition) => void,
  onSubmit: () => void,
  value: Definition
};

export default class DefinitionParser extends React.Component<DefinitionParserProps, {}> {
  onTextChanged = (e: InputChangedEvent) => {
    const newValue = {};
    const groups = e.target.value.split(';').map(group => group.trim()).filter(group => group.length > 0).map(group => group.split(',').map(value => value.trim()).filter(value => value.length > 0));
    // console.log('input', groups);
    // this.props.onValuesChanged('english_translation', groups);
    // console.log('expected', this.englishTranslationToValue(this.props.value));
  };

  onKeyDown = (e: KeyDownEvent) => {
    if (e.ctrlKey && e.keyCode == 13) {
      this.props.onSubmit();
    }
  };

  // englishTranslationToValue = (value: Definition): Set<string> => {
  //   return new Set(value.field_defs.english_group.values.map(this.englishGroupToValue));
  // };

  // englishGroupToValue = (value: Definition): Set<string> => {
  //   return new Set(value.field_defs.english.values.map(this.englishToString));
  // };

  // englishToValue = (value: Definition): Set<string> => {
  //   const {before_parens, literal, after_parens} = value.field_defs;
  //   return literal.values[0];
  // };

  englishTranslationToString = (value: Value): string => {
    return (value as Definition).field_defs.english_group.values.map(this.englishGroupToString).join('; ');
  };

  englishGroupToString = (value: Value): string => {
    return (value as Definition).field_defs.english.values.map(this.englishToString).join(', ');
  };

  englishToString = (value: Value): string => {
    const {before_parens, literal, after_parens} = (value as Definition).field_defs;
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
