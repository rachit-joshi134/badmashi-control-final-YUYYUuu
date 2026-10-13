import {db,json} from "./_shared.mjs";
export const handler=async event=>{
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed."},{Allow:"GET"});
 const ref=String(event.queryStringParameters?.reference||"").trim();
 if(ref.length<5||ref.length>100)return json(400,{error:"Enter a valid reference."});
 try{
  const client=db();
  const cert=await client.from("certificates").select("certificate_id,status,issue_date").eq("certificate_id",ref).maybeSingle();
  if(cert.error)throw cert.error;
  if(cert.data)return json(200,{type:"certificate",certificate_id:cert.data.certificate_id,status:cert.data.status,issue_date:cert.data.issue_date});
  const app=await client.from("driver_applications").select("reference,status,created_at").eq("reference",ref).maybeSingle();
  if(app.error)throw app.error;
  if(app.data)return json(200,{type:"application",reference:app.data.reference,status:app.data.status,submitted_at:app.data.created_at});
  return json(404,{error:"No matching certificate or application reference was found."});
 }catch(e){console.error("Reference lookup failed:",e.message);return json(503,{error:"Record verification is temporarily unavailable."});}
};
