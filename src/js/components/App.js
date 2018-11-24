import React, { Component } from 'react';
import Card from './Card';

export default class App extends Component {
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
