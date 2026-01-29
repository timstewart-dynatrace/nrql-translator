import { Page } from "@dynatrace/strato-components-preview/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Translator } from "./pages/Translator";

export const App = () => {
  return (
    <Page>
      <Page.Header>
        <Header />
      </Page.Header>
      <Page.Main>
        <Routes>
          <Route path="/" element={<Translator />} />
          <Route path="/translator" element={<Translator />} />
        </Routes>
      </Page.Main>
    </Page>
  );
};
