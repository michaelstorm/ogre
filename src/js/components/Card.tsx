import * as React from 'react';
import _ from 'lodash';

import FromDefinition from './FromDefinition';
import ToFieldDefinition from './ToFieldDefinition';
import {Answer, CardProps, Definition, FieldDefinition} from './interfaces';
import {check_definition_responses} from './response_comparators';
import {visit_definition_fields} from './to_definition_visitors';

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
  constructor(props: CardProps) {
    super(props);

    const initial_response: Answer = visit_definition_fields(JSON.parse(JSON.stringify(props.to[0])));
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
      responses.push(visit_definition_fields(this.props.to_fields));
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
    } = check_definition_responses(this.props.to, this.state.responses);

    this.setState({
      correct_responses,
      incorrect_responses: remaining_responses,
      remaining_answers
    });
  };

  render() {
    const from_data = this.props.from;
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
                                           isCorrect={false}
                                           isIncorrect={false}
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
