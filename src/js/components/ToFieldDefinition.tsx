import * as React from 'react';
import {Definition, FieldDefinition, KeyDownEvent, InputChangedEvent, Value} from './interfaces';
import ToDefinition from './ToDefinition';
import {visit_to_field_definition} from './to_definition_visitors';

type ToFieldDefinitionProps = FieldDefinition & {
  onValuesChanged: (values: FieldDefinition) => void,
  onSubmit: () => void,
  isCorrect: boolean,
  isIncorrect: boolean,
  isReadOnly: boolean
};

export default class ToFieldDefinition extends React.Component<ToFieldDefinitionProps, {}> {
  static defaultProps = {
    onValuesChanged: () => {},
    onSubmit: () => {}
  };

  modifyValuesArray = (modifyArray: (values: Array<Value>) => void) => {
    const values = modifyArray(this.props.values.slice());
    const props = Object.assign({}, this.props, {values});

    const {onValuesChanged} = this.props;
    onValuesChanged && onValuesChanged(props);
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

  onKeyDown = (e: KeyDownEvent) => {
    const {onSubmit} = this.props;
    if (e.ctrlKey && e.keyCode == 13) {
      onSubmit && onSubmit();
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
        : undefined;

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
