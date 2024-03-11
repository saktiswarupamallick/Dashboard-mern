// Import necessary libraries and components
import axios from "axios";
import stubs from "./stubs";
import React, { useState, useEffect } from "react";
import moment from "moment";

function CodeEditor() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);

  useEffect(() => {
    setCode(stubs[language]);
  }, [language]);

  useEffect(() => {
    const defaultLang = localStorage.getItem("default-language") || "cpp";
    setLanguage(defaultLang);
  }, []);

  let pollInterval;

  const handleSubmit = async () => {
    const payload = {
      language,
      code,
    };
    try {
      setOutput("");
      setStatus(null);
      setJobId(null);
      setJobDetails(null);
      const { data } = await axios.post("https://humble-spoon-q774vxjp5j4g3xrx9-5000.app.github.dev/run", payload);
      if (data.jobId) {
        setJobId(data.jobId);
        setStatus("Submitted.");

        // poll here
        pollInterval = setInterval(async () => {
          const { data: statusRes } = await axios.get(
            `https://humble-spoon-q774vxjp5j4g3xrx9-5000.app.github.dev/status`,
            {
              params: {
                id: data.jobId,
              },
            }
          );
          const { success, job, error } = statusRes;
          console.log(statusRes);
          if (success) {
            const { status: jobStatus, output: jobOutput } = job;
            setStatus(jobStatus);
            setJobDetails(job);
            if (jobStatus === "pending") return;
            setOutput(jobOutput);
            clearInterval(pollInterval);
          } else {
            console.error(error);
            setOutput(error);
            setStatus("Bad request");
            clearInterval(pollInterval);
          }
        }, 1000);
      } else {
        setOutput("Retry again.");
      }
    } catch ({ response }) {
      if (response) {
        const errMsg = response.data.err.stderr;
        setOutput(errMsg);
      } else {
        setOutput("Please retry submitting.");
      }
    }
  };

  const setDefaultLanguage = () => {
    localStorage.setItem("default-language", language);
    console.log(`${language} set as default!`);
  };

  const renderTimeDetails = () => {
    if (!jobDetails) {
      return "";
    }
    let { submittedAt, startedAt, completedAt } = jobDetails;
    let result = "";
    submittedAt = moment(submittedAt).toString();
    result += `Job Submitted At: ${submittedAt}  `;
    if (!startedAt || !completedAt) return result;
    const start = moment(startedAt);
    const end = moment(completedAt);
    const diff = end.diff(start, "seconds", true);
    result += `Execution Time: ${diff}s`;
    return result;
  };

  return (
    <div className="codeeditor p-6 max-w-screen-lg mx-auto bg-gray-100 rounded shadow-lg">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">Online Code Compiler</h1>

      <div className="mb-4">
        <label className="mr-2 text-gray-700">Language:</label>
        <select
          value={language}
          onChange={(e) => {
            const shouldSwitch = window.confirm(
              "Are you sure you want to change language? WARNING: Your current code will be lost."
            );
            if (shouldSwitch) {
              setLanguage(e.target.value);
            }
          }}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="cpp">C++</option>
          <option value="py">Python</option>
        </select>
      </div>

      <div className="mb-4">
        <button onClick={setDefaultLanguage} className="bg-blue-500 text-white px-4 py-2 rounded">
          Set Default
        </button>
      </div>

      <textarea
        rows="20"
        cols="75"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
        }}
        className="p-2 border border-gray-300 rounded w-full focus:outline-none focus:ring focus:border-blue-500"
      ></textarea>

      <button
        onClick={handleSubmit}
        className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 focus:outline-none focus:ring focus:border-green-700"
      >
        Submit
      </button>

      <p className="mt-4 text-gray-700">{status}</p>
      <p className="text-gray-700">{jobId ? `Job ID: ${jobId}` : ""}</p>
      <p className="text-gray-700">{renderTimeDetails()}</p>
      <p className="mt-4 text-gray-800">{output}</p>
    </div>
  );
}

export default CodeEditor;
