import Project from "../models/projectModel.js";
import Milestone from "../models/milestoneModel.js";
import ProgressReport from "../models/progressReportModel.js";
import ProjectAssignment from "../models/projectAssignmentModel.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const KNOWLEDGE_BASE = {
  terminology: {
    "footing": "A **footing** is the foundational base of a structure that distributes building loads directly onto the underlying soil. Typically made of cast reinforced concrete with rebar grids, footings are placed below the frost line to prevent settling.",
    "reinforced concrete": "**Reinforced Concrete** is composite concrete embedded with high-tensile steel rebar or mesh. While concrete possesses immense compressive strength, steel provides the necessary tensile strength to resist bending, seismic forces, and shear stress.",
    "slab": "A **slab** is a flat, horizontal structural concrete element (often 100mm to 200mm thick) that forms floors, ceilings, or ground foundations. Slabs can be ground-bearing or suspended on beams and columns.",
    "lintel": "A **lintel** is a horizontal structural beam spanning across openings like doors and windows to support the weight of the masonry or brick wall directly above.",
    "structural column": "A **structural column** is a vertical compression member that transmits the load of ceilings, beams, and upper floors down to the foundation and footings.",
    "foundation curing": "**Foundation curing** is the vital process of maintaining adequate moisture, temperature, and time in freshly poured concrete so it achieves full structural compressive strength (typically 28 days for full design rating). Proper curing prevents shrinkage cracks.",
  },
  platform: {
    "create project": "To create a project in Camtrust: Navigate to the **Projects** tab, click **+ Create Project**, fill in the project title, site location, estimated budget, description, and timeline, then submit for Administrator approval.",
    "monitor project": "To monitor your project: Go to **Owner Dashboard** or **Projects**, select your project, and view the **Chronological Monitoring Timeline**. You can see live milestone percentages, in-app verified site photos, real GPS coordinates, capture timestamps, and verified engineer progress reports.",
    "engineer verification": "Engineer verification works via Camtrust KYC: The engineer uploads official eligibility documents (attestation of employment, engineering certificates, professional licenses). Camtrust performs an automated KYC analysis check, and the Administrator conducts the final review to award the **✓ VERIFIED CONSTRUCTION PROFESSIONAL** badge.",
    "upload verification documents": "To upload verification documents: Engineers go to their **Engineer Dashboard**, click **Request Verification / Upload Documents**, select the document type (attestation of employment, certificate, license, ID), and submit for Administrator review.",
    "capture site evidence": "To capture site evidence: Verified Engineers click **📷 CAPTURE SITE EVIDENCE** inside the Camtrust app while at the construction site. The app requests device camera and GPS permissions, captures the site photo, stamps the exact date/time + real GPS coordinates, and attaches it to the milestone progress update.",
    "why gps": "Camtrust requires real GPS location to guarantee authenticity and prevent construction fraud. By recording the real phone coordinates and timestamps directly at the site, Project Owners have cryptographic certainty that the engineer inspected the actual construction site.",
    "view report": "To view an Engineer's progress report: Open your project in the **Projects** tab or **Owner Dashboard**, scroll to the Progress Reports section or Monitoring Timeline, and click **[View Report]**.",
    "download pdf": "To download a progress report as a PDF: Click **[Download PDF]** on any progress report or from the Report Viewer modal. Camtrust generates a professional A4 multi-page PDF using the official Camtrust construction monitoring template.",
  }
};

const getFallbackResponse = (question) => {
  const q = question.toLowerCase();
  for (const [key, answer] of Object.entries(KNOWLEDGE_BASE.terminology)) {
    if (q.includes(key)) {
      return `${answer}\n\n*Note: For safety-critical construction decisions, always consult a qualified on-site civil engineer.*`;
    }
  }
  for (const [key, answer] of Object.entries(KNOWLEDGE_BASE.platform)) {
    if (q.includes(key)) {
      return answer;
    }
  }
  return "I am the Camtrust AI Assistant. I specialize in explaining **construction technical terminology** (e.g. footings, reinforced concrete, slabs, curing, columns) and **how to use Camtrust** (project creation, engineer KYC, in-app camera & GPS evidence capture, and professional PDF reports).\n\nHow can I help with your construction project today?";
};

export const askAssistant = async (req, res) => {
  try {
    const { projectId, question, message } = req.body;
    const userQuery = question || message;

    if (!userQuery) {
      return res.status(400).json({ success: false, message: "Question is required" });
    }

    if (projectId) {
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      if (req.user?.role !== "administrator" && req.user?.role !== "property_owner") {
        const assignment = await ProjectAssignment.findOne({
          where: { projectId, professionalId: req.user?.userId },
        });

        if (!assignment) {
          return res.status(403).json({
            success: false,
            message: "Forbidden: only the project owner, administrator, or assigned professional may ask this assistant.",
          });
        }
      }
    }

    let projectContext = "";
    if (projectId) {
      try {
        const project = await Project.findByPk(projectId);
        if (project) {
          const milestones = await Milestone.findAll({ where: { projectId } });
          const latestReport = await ProgressReport.findOne({
            where: { projectId },
            order: [["generatedAt", "DESC"]],
          });
          projectContext = `\nCurrent Project Context:
- Title: ${project.title}
- Location: ${project.location}
- Status: ${project.status}
- Milestones: ${milestones.map(m => `${m.label} (${m.completionRate}%)`).join(", ")}`;
          if (latestReport) {
            projectContext += `\n- Latest Update: ${latestReport.summary || "No summary"}`;
          } else {
            projectContext += `\n- Latest Update: No reports yet`;
          }
        }
      } catch (err) {
        console.warn("Could not load project context for AI:", err);
      }
    }

    const systemPrompt = `You are the official **Camtrust AI Assistant**, an expert specialized ONLY in:
1. **Construction Technical Knowledge & Terminology**: Explaining structural engineering terms (e.g., footings, reinforced concrete, slabs, lintels, columns, curing, rebar, compaction, formwork) and site inspection best practices.
2. **Camtrust Platform Workflows**: Guiding users on project creation, administrator approvals, engineer KYC verification, in-app site evidence capture (camera & GPS tracking), milestone progress tracking, and generating PDF inspection reports.

### STRICT OPERATING RULES:
- **Stay on Theme**: Respond ONLY to questions related to construction, structural engineering, building monitoring, site safety, or how to use the Camtrust platform.
- **Off-Topic Questions**: If the user asks a question completely unrelated to construction or Camtrust (e.g., movie recommendations, recipes, general history, non-construction coding), politely decline with:
  "I am the Camtrust AI Assistant. I can only assist with construction engineering topics and questions about using the Camtrust platform."
- **Safety Precaution**: For critical structural or safety decisions, always advise the user to consult a qualified licensed civil engineer on-site.
- **Tone**: Professional, clear, authoritative, and helpful.

${projectContext}

User Query: ${userQuery}`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "mock_key") {
      const q = userQuery.toLowerCase();
      if ((q.includes("summar") || q.includes("progress report") || q.includes("latest update")) && projectContext) {
        return res.status(200).json({
          success: true,
          response: `Here is a concise summary of the selected construction project:${projectContext}\n\n*Note: For safety-critical construction decisions, always consult a qualified on-site civil engineer.*`,
        });
      }
      const fallback = getFallbackResponse(userQuery);
      return res.status(200).json({ success: true, response: fallback });
    }

    const modelsToTry = [
      process.env.GEMINI_MODEL || "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
    ];

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
            }),
            redirect: "follow",
          }
        );

        if (response.ok) {
          const data = await response.json();
          const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiMessage) {
            return res.status(200).json({ success: true, response: aiMessage });
          }
        }
      } catch (err) {
        console.warn(`Gemini model ${model} failed, trying next:`, err.message);
      }
    }

    // High quality construction fallback
    const fallback = getFallbackResponse(userQuery);
    return res.status(200).json({ success: true, response: fallback });
  } catch (error) {
    console.error("AI controller error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};