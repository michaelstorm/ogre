import * as React from 'react';
import Card from './Card';

export default class App extends React.Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {cards: []};
  }

  componentDidMount() {
    fetch('/api/cards').then(response => {
      response.json().then(cards => {
        this.setState({cards});
      });
    });
  }

  render() {
    return (
      <div className="app">
        {this.state.cards.length && <Card data={this.state.cards[0]} />}
      </div>
    );
  }
};
