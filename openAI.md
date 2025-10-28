// ChatGPT 图片分析示例（正确版本）
const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 分析户型图的示例函数
async function analyzeFloorPlan() {
  const imageUrl = "https://example.com/floor-plan.jpg";

  const response = await client.chat.completions.create({
    model: "gpt-4o", // 使用支持视觉的模型
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "请描述这个户型图的布局，包括房间数量、位置和朝向。" 
          },
          { 
            type: "image_url", 
            image_url: { url: imageUrl }
          }
        ]
      }
    ],
    max_tokens: 1000
  });

  console.log(response.choices[0].message.content);
}

// 在云函数中使用（已集成到 aiAnalysis/index.js）
module.exports = { analyzeFloorPlan };