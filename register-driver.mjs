import {db,json,parseBody,clean,validEmail,reference,originAllowed} from "./_shared.mjs";
const categories=["Under 19","F1 Trainee","Non-F1 Trainee","Go-Karting","NASCAR","Rally"];
export const handler=async event=>{
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed."},{Allow:"POST"});
 if(!originAllowed(event))return json(403,{error:"Origin not allowed."});
 const b=parseBody(event);if(!b)return json(400,{error:"Invalid request body."});
 const full_name=clean(b.full_name),email=clean(b.email).toLowerCase(),category=clean(b.category);
 if(full_name.length<2||full_name.length>120)return json(400,{error:"Enter a name between 2 and 120 characters."});
 if(!validEmail(email))return json(400,{error:"Enter a valid email address."});
 if(!categories.includes(category))return json(400,{error:"Choose a valid category."});
 if(b.consent!==true)return json(400,{error:"Consent is required."});
 if(b.date_of_birth && (!/^\d{4}-\d{2}-\d{2}$/.test(b.date_of_birth)||new Date(b.date_of_birth)>new Date()))return json(400,{error:"Enter a valid date of birth."});
 const referenceId=reference("ISRO-APP");
 try{
  const {error}=await db().from("driver_applications").insert({reference:referenceId,full_name,email,nationality:clean(b.nationality).slice(0,80)||null,category,discipline:clean(b.discipline).slice(0,80)||null,team:clean(b.team).slice(0,120)||null,date_of_birth:b.date_of_birth||null,experience:clean(b.experience).slice(0,2000)||null,guardian_consent:b.guardian_consent===true,status:"Submitted",consent_at:new Date().toISOString()});
  if(error){console.error("Application insert failed:",error.code);return json(500,{error:"We could not store the application. Please try again later."});}
  return json(201,{ok:true,reference:referenceId});
 }catch(e){console.error("Application service unavailable:",e.message);return json(503,{error:"Application storage is not configured yet. Please try again later."});}
};
