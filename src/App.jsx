import { useState, useEffect } from "react";
import constants, { buildPresenceChecklist, METRIC_CONFIG } from '../constants.js';
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function App() {
  const [aiReady, setAiReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [presenceChecklist, setPresenceChecklist] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.puter?.ai?.chat) {
        setAiReady(true);
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval)
  }, []);

  const extractPDFText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const texts = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1).then(
        (page) => page
          .getTextContent()
          .then((tc) => tc.items.map((i) => i.str).join(" "))
      ))
    );
    return texts.join('\n').trim();
  };

  const parseJSONResponse = (reply) => {
    try {
      // const match = reply.match(/\{\s\S}*\}/);
      const match = reply.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : {};
      console.log(parsed);
      if (!parsed.overallScore && !parsed.error) {
        throw new Error("Invalid AI Response");
      }
      return parsed;

    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  };

  const analyzeResume = async (text) => {
    const prompt = constants.ANALYZE_RESUME_PROMPT.replace(
      "{{DOCUMENT_TEXT}}", text
    );

    const response = await window.puter.ai.chat(
      [
        { role: "system", content: "You are an expert resume reviewer..." },
        { role: "user", content: prompt },
      ],
      {
        model: "gpt-4o",
      }
    );

    const result = parseJSONResponse(
      typeof response === "string" ? response : response.message?.content || ""
    );

    if (result.error) throw new Error(result.error);
    return result;

  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      return alert("Please upload a PDF file only.");
    }

    setUploadFile(file);
    setIsLoading(true);
    // setAnalysis(null);
    // setResumeText("");
    // setPresenceChecklist([]);

    // try {
    //   const text = await extractPDFText(file);
    //   setResumeText(text);
    //   setPresenceChecklist(buildPresenceChecklist(text));
    //   setAnalysis(await analyzeResume(text));
    // } catch (error) {
    //   alert(`Error: ${error.message}`);
    //   reset();
    // } finally {
    //   setIsLoading(false);
    // }

    try {
      console.log("📥 Inside try block");

      const text = await extractPDFText(file);
      console.log("✅ Step 1: PDF text extracted:", text?.slice(0, 100));

      const checklist = buildPresenceChecklist(text);
      console.log("✅ Step 2: Presence checklist:", checklist);

      const analysisResult = await analyzeResume(text);
      console.log("✅ Step 3: AI analysis result:", analysisResult);

      setResumeText(text);
      setPresenceChecklist(checklist);
      setAnalysis(analysisResult);

      console.log("🎯 Step 4: All states updated successfully");
    } catch (error) {
      console.error("🧨 Full error object:", error);
      alert(`Error: ${error?.message || "Unknown error occurred"}`);
      reset();
    } finally {
      console.log("🕓 Finally block executed");
      setIsLoading(false);
    }

  };

  const reset = () => {
    setUploadFile(null);
    setAnalysis(null);
    setResumeText('');
    setPresenceChecklist([]);
  };

  return (
    <div className="min-h-screen bg-main-gradient p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="max-w-5xl mx-auto w-full">
        {/* HEADER INFO */}
        <div className="text-center mb-6">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light bg-gradient-to-r from-cyan-300 via-teal-200
        to-sky-300 bg-clip-text text-transparent mb-2">
            AI Resume Analyzer
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">
            Upload your PDF resume and get instant AI feedback
          </p>
        </div>
        {/* UPLOAD SECTION */}
        {!uploadFile && (
          <div className="upload-area">
            <div className="upload-zone">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4">📄</div>
              <h3 className="text-xl sm:text-2xl text-slate-200 mb-2">
                Upload Your Resume
              </h3>
              <p className="text-slate-400 mb-4 sm:mb-6 text-sm sm:text-base">
                PDF files only 🟢 Get instant analysis
              </p>

              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={!aiReady}
                className="hidden"
                id="file-upload"
              />

              <label
                htmlFor="file-upload"
                className={`inline-block btn-primary ${!aiReady ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Choose PDF File
              </label>
            </div>
          </div>
        )}
        {/* LOADING SECTION */}
        {isLoading && (
          <div className="p-6 sm:p-8 max-w-md mx-auto">
            <div className="text-center">
              <div className="loading-spinner"></div>
              <h3 className="text-lg sm:text-xl text-shadow-slate-200 mb-2 text-white">
                Analyzing Your Resume
              </h3>
              <p className="text-slate-400 text-sm sm:text-base">
                Please wait while AI reviews your resume...
              </p>
            </div>
          </div>
        )}
        {/* LOADED SECTION  */}
        {analysis && uploadFile && (
          <div className="space-y-6 p-4 sm:px-8 lg:px-16">
            {/* FILE INFO SECTION */}
            <div className="file-info-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="icon-container-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
                    <span className="text-3xl">📄</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-500 mb-1">
                      Analysis Complete
                    </h3>
                    <p className="text-slate-300 text-sm break-all">{uploadFile.name}</p>
                  </div>
                </div>

                <button className='inline-block btn-primary' onClick={reset}>New Analysis</button>
              </div>
            </div>
            {/* SCORE CARD SECTION */}
            <div className="score-card">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-2xl">🏆</span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Overall Score
                  </h2>
                </div>
                <div className="relative">
                  <p className="text-6xl sm:text-8xl font-extrabold text-cyan-400 drop-show-lg">
                    {analysis.overallScore || "7"}
                  </p>
                </div>
                <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full 
                  ${parseInt(analysis.overallScore) >= 8 ? "score-status-excellent" : parseInt(analysis.overallScore) >= 6
                    ? "score-status-good" : "score-status-improvement"
                  }`}>
                  <span className="text-lg">
                    {parseInt(analysis.overallScore) >= 8 ? '🌟' : parseInt(analysis.overallScore) >= 6 ? '⭐' : '📈'}
                  </span>
                  <span className="font-semibold text-lg">
                    {parseInt(analysis.overallScore) >= 8 ? 'Excellent' : parseInt(analysis.overallScore) >= 6 ? 'Good' : 'Need improvement'}
                  </span>
                </div>
              </div>
              <div className="progress-bar">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm
                    ${parseInt(analysis.overallScore) >= 8 ? "progress-excellent" : parseInt(analysis.overallScore) >= 6 ? 'progress-good' : 'progress-improvement'}`}
                  style={{
                    width: `${(parseInt(analysis.overallScore) / 10 * 100)}%`,
                  }}></div>
              </div>
              <p className="text-slate-400 text-sm mt-3 text-center font-medium">
                Score based on content quality, formatting, and keywords usage
              </p>
            </div>
            {/* Qualification & Work Experience SECTION */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Qualification */}
              <div className="feature-card-green group">
                <div className="bg-green-500/20 icon-container-lg mx-auto mb-3 group-hover:bg-green-400/30 transition-colors">
                  <span className="text-green-300 text-xl">🎓</span>
                </div>
                <h4 className="text-green-300 text-sm font-semibold uppercase tracking-wide mb-3">
                  Qualification
                </h4>
                <div className="space-y-2 text-left">
                  {analysis.qualification?.length > 0 ? (
                    <>
                      <div className="list-item-green">
                        <span className="text-green-400 text-sm mt-0.5">•</span>
                        <span className="text-slate-200 font-medium text-sm leading-relaxed">
                          <strong className="text-green-300">Latest:</strong> {analysis.qualification[0]}
                        </span>
                      </div>
                      <div className="list-item-green">
                        <span className="text-green-400 text-sm mt-0.5">•</span>
                        <span className="text-slate-200 font-medium text-sm leading-relaxed">
                          <strong className="text-green-300">Earliest:</strong> {analysis.qualification[1]}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">No qualification data found</p>
                  )}
                </div>
              </div>

              {/* Work Experience */}
              <div className="feature-card-orange group">
                <div className="bg-orange-500/20 icon-container-lg mx-auto mb-3 group-hover:bg-orange-400/30 transition-colors">
                  <span className="text-orange-300 text-xl">💼</span>
                </div>
                <h4 className="text-orange-300 text-sm font-semibold uppercase tracking-wide mb-3">
                  Work Experience
                </h4>
                <div className="space-y-2 text-left">
                  {analysis.experience?.length > 0 ? (
                    <>
                      <div className="list-item-orange">
                        <span className="text-orange-400 text-sm mt-0.5">•</span>
                        <span className="text-slate-200 font-medium text-sm leading-relaxed">
                          <strong className="text-orange-300">Total:</strong> {analysis.experience[0]}
                        </span>
                      </div>
                      <div className="list-item-orange">
                        <span className="text-orange-400 text-sm mt-0.5">•</span>
                        <span className="text-slate-200 font-medium text-sm leading-relaxed">
                          <strong className="text-orange-300">Domain:</strong> {analysis.experience[1]}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="list-item-orange">
                      <span className="text-orange-400 text-sm mt-0.5">•</span>
                      <span className="text-slate-200 font-medium text-sm leading-relaxed">
                        <strong className="text-orange-300">Status:</strong> Fresher
                      </span>
                    </div>

                  )}
                </div>
              </div>
            </div>


            {/* STRENGTHS & IMPROVEMENT SECTION */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="feature-card-green group">
                <div className="bg-green-500/20 icon-container-lg mx-auto mb-3
                  group-hover:bg-green-400/30 transition-colors">
                  <span className="text-green-300 text-xl">🗸</span>
                </div>
                <h4 className="text-green-300 text-sm font-semibold uppercase tracking-wide mb-3">
                  Top Strengths
                </h4>
                <div className="space-y-2 text-left">
                  {analysis.strengths.slice(0, 3).map((strength, index) => (
                    <div key={index} className="list-item-green">
                      <span className="text-green-400 text-sm mt-0.5">•</span>
                      <span className="text-slate-200 font-medium text-sm leading-relaxed">
                        {strength}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="feature-card-orange group">
                <div className="bg-orange-500/20 icon-container-lg mx-auto mb-3
                  group-hover:bg-orange-400/30 transition-colors">
                  <span className="text-orange-300 text-xl">⚡</span>
                </div>
                <h4 className="text-orange-300 text-sm font-semibold uppercase tracking-wide mb-3">
                  Main Improvements
                </h4>
                <div className="space-y-2 text-left">
                  {analysis.improvements.slice(0, 3).map((improvement, index) => (
                    <div key={index} className="list-item-orange">
                      <span className="text-orange-400 text-sm mt-0.5">•</span>
                      <span className="text-slate-200 font-medium text-sm leading-relaxed">
                        {improvement}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* EXECUTIVE SUMMARY SECTION */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-4">
                <div className="icon-container bg-purple-500/20">
                  <span className="text-purple-300 text-lg">📝</span>
                </div>
                <h4 className="text-xl font-bold text-white">
                  Executive Summary
                </h4>
              </div>
              <div className="summary-box">
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                  {analysis.summary}
                </p>
              </div>
            </div>
            {/* PERFORMANCE METRICS */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-cyan-500/20">
                  <span className="text-cyan-300 text-lg">📊</span>
                </div>
                <h4 className="text-xl font-bold text-white">Performance Metrics</h4>
              </div>

              <div className="space-y-4">
                {METRIC_CONFIG.map((cfg, index) => {
                  const value = analysis.performanceMetrics?.[cfg.key] ?? cfg.defaultValue;
                  return <div key={index} className="group/item">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {cfg.icon}
                        </span>
                        <p className="text-slate-200 font-medium">
                          {cfg.label}
                        </p>
                      </div>
                      <span className="text-slate-300 font-bold">
                        {value} / 10
                      </span>
                    </div>
                    <div className="progress-bar-small">
                      <div className={`h-full bg-gradient-to-r ${cfg.colorClass} rounded-full transition-all duration-1000 ease-out group-hover/item:shadow-lg
                        ${cfg.shadowClass}`}
                        style={{ width: `${(value / 10) * 100}%` }}>
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
            {/* RESUME INSIGHTS */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-purple-500/20">
                  <span className="text-lg text-purple-300">🔍</span>
                </div>
                <h2 className="text-xl font-bold text-purple-400">
                  Resume Insights
                </h2>
              </div>
              <div className="grid gap-4">
                <div className="info-box-cyan group/item">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg text-cyan-400">🎯</span>
                    <h3 className="text-cyan-300 font-semibold">
                      Action Items
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {(
                      analysis.actionItems || [
                        "Optimize keyword placement for better ATS scoring",
                        "Enhance content with quantifiable achievements",
                        "Consider industry-specific terminology",
                      ]
                    ).map((item, index) => (
                      <div className="list-item-cyan" key={index}>
                        <span className="text-cyan-400">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="info-box-emerald group/item">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">💡</span>
                    <h2 className="text-emerald-300 font-semibold">Pro Tips</h2>
                  </div>
                  <div className="space-y-2">
                    {(analysis.proTips || [
                      "Use action verbs to start bullet points",
                      "Keep description concise and impactful",
                      "Tailor keywords to specific job descriptions",
                    ]).map((tip, index) => (
                      <div key={index} className="list-item-emerald">
                        <span className="text-emerald-400">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* ATS OPTIMIZATION */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-violet-500/20">
                  <span className="text-lg">🤖</span>
                </div>
                <h2 className="text-violet-300 font-semibold">ATS Optimization</h2>
              </div>

              <div className="info-box-violet mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <div>
                    <h3 className="text-violet-300 font-semibold mb-2">What is ATS?</h3>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      <strong>
                        Applicant Tracking Systems (ATS)
                      </strong> {""}
                      are software tools used by 75%+ of employers to automatically screen resumes before human review. These systems scan for keywords, proper formatting, and relevant qualifications to rank candidates. If your resume isn't ATS-friendly, it may never reach a human recruiter.
                    </p>
                  </div>
                </div>
              </div>

              <div className="info-box-violet">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-violet-400 text-lg">🤖</span>
                  <h3 className="text-lg font-semibold text-violet-300">
                    ATS Compatibility Checklist
                  </h3>
                </div>
                <div className="space-y-2">
                  {(presenceChecklist || []).map((item, index) => (
                    <div className="flex items-start gap-2 text-slate-200" key={index}>
                      <span className={`
                            ${item.present ? "text-emerald-400" : "text-red-400"}`}>
                        {item.present ? "✅" : "❌"}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* KEYWORDS RECOMMENDATION */}
            <div className="section-card group">
              <div className="flex items-center gap-3 mb-6">
                <div className="icon-container bg-blue-500/20">
                  <span className="text-lg">🔑</span>
                </div>
                <h2 className="text-blue-300 font-semibold">Recommended Keywords</h2>
              </div>
              <div className="flex flex-wrap gap-3 mb-4">
                {analysis.keywords.map((key, index) => (
                  <span key={index} className="keyword-tag group/item">
                    {key}
                  </span>
                ))}
              </div>
              <div className="info-box-blue">
                <p className="text-slate-300 text-sm leading-relaxed items-start gap-2">
                  <span className="text-lg mt-0.5">💡</span>
                  Consider incorporating these keywords naturally into your
                  resume to improve ATS Compatibility and increase you chances of getting noticed by
                  recruiters.
                </p>
              </div>
            </div>
          </div>

        )}
      </div>
    </div>
  );
}

export default App;
