import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";
import { CrossmarkType } from "../types";
import RecentView from "./RecentView";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { loadCrossmarks } from "../utils";

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const Popup = () => {
  const [crossmarks, setCrossmarks] = useState<Record<string, CrossmarkType>>();
  const [activeTab, setActiveTab] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  const reloadCrossmarks = React.useCallback(
    () => loadCrossmarks().then((data) => setCrossmarks(data)),
    [setCrossmarks]
  );
  useEffect(() => {
    reloadCrossmarks();
  }, []);

  return (
    <>
      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            centered
            value={activeTab}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            <Tab label="Recents" {...a11yProps(0)} />
            <Tab label="Tags" {...a11yProps(1)} />
            <Tab label="More" {...a11yProps(2)} />
          </Tabs>
        </Box>
      </Box>
      {activeTab === 0 && (
        <RecentView
          crossmarks={crossmarks}
          reloadCrossmarks={reloadCrossmarks}
        />
      )}
    </>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
