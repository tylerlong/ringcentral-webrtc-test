import React, { useEffect } from 'react';
import { auto } from 'manate/react';

import type { Store } from './store';
import { createPhone } from './softphone';

const App = (props: { store: Store }) => {
  // create phone on mount
  useEffect(() => {
    createPhone();
  }, []);

  // scroll to bottom on new messages
  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, [props.store.messages.length]);

  const { store } = props;
  const render = () => (
    <>
      <pre>{store.messages.join('\n\n')}</pre>
    </>
  );
  return auto(render, props);
};

export default App;
