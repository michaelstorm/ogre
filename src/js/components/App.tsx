import * as React from 'react';
import Card from './Card';
import {CardProps} from './interfaces';

interface AppState {
  cards: Array<CardProps>
}

export default class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {cards: []};
  }

  componentDidMount() {
    fetch('/api/cards').then(response => {
      response.json().then((cards: Array<CardProps>) => {
        this.setState({cards});
      });
    });
  }

  render() {
    return (
      <div className="app">
        {this.state.cards.length && <Card {...this.state.cards[0]} />}
      </div>
    );
  }
};
