import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function test() {
  const { data, error } = await supabase.from("profiles").insert([{
    id: "00000000-0000-0000-0000-000000000000",
    display_name: "Test",
    user_type: "founder"
  }]);

  if (error && error.code === "PGRST204") {
    console.log("COLUMN MISSING: user_type does not exist. (PGRST204)");
  } else if (error) {
    console.log("OTHER ERROR:", error);
  } else {
    console.log("COLUMN EXISTS! Insert successful.");
    // clean up
    await supabase.from("profiles").delete().eq("id", "00000000-0000-0000-0000-000000000000");
  }
}
test();
