import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from './components/App';

// PromptPage 컴포넌트
const PromptPage = () => {
  return <div>Hello World from Prompt Page</div>;
};

// CreditsPage 컴포넌트
const CreditsPage = () => {
  return <div>Hello World from Credits Page</div>;
};

// 메모리 라우터 생성 및 라우트 설정
const router = createMemoryRouter([
  { path: '/', element: <App /> },
  { path: '/prompt', element: <PromptPage /> },
  { path: '/credits', element: <CreditsPage /> },
]);

const Root = () => {
  return <RouterProvider router={router} />;
};

export default Root;
