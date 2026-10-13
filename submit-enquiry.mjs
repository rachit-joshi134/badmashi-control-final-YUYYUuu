import {db,json,parseBody,clean,validEmail,reference,originAllowed} from "./_shared.mjs";
export const handler=async event=>{
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed."},{Allow:"POST"});
 if(!originAllowed(event))return json(403,{error:"Origin not allowed."});
 const b=parseBody(event);if(!b)return json(400,{error:"Invalid request body."});
 const name=clean(b.name),email=clean(b.email).toLowerCase(),service=clean(b.service),message=clean(b.message);
 if(name.length<2||name.length>100)return json(400,{error:"Enter a name between 2 and 100 characters."});
 if(!validEmail(email))return json(400,{error:"Enter a valid email address."});
 if(service.length<2||service.length>100)return json(400,{error:"Choose a valid service."});
 if(message.length<15||message.length>4000)return json(400,{error:"Project brief must be between 15 and 4,000 characters."});
 if(b.consent!==true)return json(400,{error:"Consent is required to submit an enquiry."});
 try{
  const ref=reference("NLQ");
  const {error}=await db().from("enquiries").insert({reference:ref,name,email,service,budget:clean(b.budget).slice(0,80)||null,message,status:"New"});
  if(error){console.error("Enquiry insert failed:",error.code);return json(500,{error:"We could not store your enquiry. Please try again later."});}
  return json(201,{ok:true,reference:ref});
 }catch(e){console.error("Enquiry service unavailable:",e.message);return json(503,{error:"Enquiry storage is not configured yet. Please try again later."});}
};
