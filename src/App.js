import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Home from './Home';
import Room from './Room';

const App = () => (
  <div className='App'>
    <BrowserRouter>
      <Switch>
        <Route path='/' exact component={Home} />
        <Route path='/room/:roomId' component={Room} />
      </Switch>
    </BrowserRouter>
  </div>
);

export default App;
