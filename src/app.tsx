import React, { useEffect } from 'react';
import { auto } from 'manate/react';

import type { Store } from './store';
import { createPhone } from './softphone';

const App = (props: { store: Store }) => {
  useEffect(() => {
    createPhone();
  }, []);
  const { store } = props;
  const render = () => (
    <>
      <pre>{store.messages.join('\n\n')}</pre>
    </>
  );
  return auto(render, props);
};

export default App;
