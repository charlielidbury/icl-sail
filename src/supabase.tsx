import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

export default createClient<Database>(
  "https://uwticnzhykdnfbisrdrx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dGljbnpoeWtkbmZiaXNyZHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MTU1MTMsImV4cCI6MjA1NDA5MTUxM30.9xkOPAxzB0aCUcXTSf_D6hPRDhzGY_m4qmf5Wdh2sek",
);
