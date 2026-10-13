import {json,parseBody,clean,originAllowed} from "./_shared.mjs";
export const handler=async event=>{
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed."},{Allow:"POST"});
 if(!originAllowed(event))return json(403,{error:"Origin not allowed."});
 const b=parseBody(event),prompt=clean(b?.message);
 if(!b||prompt.length<1||prompt.length>4000)return json(400,{error:"Message must be between 1 and 4,000 characters."});
 const provider=(process.env.AI_PROVIDER||"gemini").toLowerCase();
 try{
  if(provider==="gemini"){
   const key=process.env.GEMINI_API_KEY;if(!key)return json(503,{error:"AI is not configured yet. Set GEMINI_API_KEY in Netlify environment variables."});
   const model=process.env.AI_MODEL||"gemini-2.5-flash";
   const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:800,temperature:0.5}})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)return json(response.status===429?429:502,{error:response.status===429?"AI request limit reached. Try again shortly.":"AI provider request failed. Check server configuration."});
   const answer=data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
   if(!answer)return json(502,{error:"The AI provider returned no answer."});
   return json(200,{answer,provider:"gemini"});
  }
  if(provider==="openai"){
   const key=process.env.OPENAI_API_KEY;if(!key)return json(503,{error:"AI is not configured yet. Set OPENAI_API_KEY in Netlify environment variables."});
   const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",input:prompt,max_output_tokens:800})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)return json(response.status===429?429:502,{error:response.status===429?"AI request limit reached. Try again shortly.":"AI provider request failed. Check server configuration."});
   const answer=data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n").trim();
   if(!answer)return json(502,{error:"The AI provider returned no answer."});
   return json(200,{answer,provider:"openai"});
  }
  return json(400,{error:"AI_PROVIDER must be gemini or openai."});
 }catch(e){console.error("AI request failed:",e.message);return json(502,{error:"AI is temporarily unavailable. Please try again later."});}
};
