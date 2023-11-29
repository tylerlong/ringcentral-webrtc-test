import React, { useEffect } from 'react';
import { Typography } from 'antd';
import { auto } from 'manate/react';

import type { Store } from './store';
import { createPhone } from './softphone';

const { Title } = Typography;

const App = (props: { store: Store }) => {
  useEffect(() => {
    createPhone();
  }, []);
  const { store } = props;
  const render = () => (
    <>
      <Title>{store.message}</Title>
    </>
  );
  return auto(render, props);
};

export default App;
