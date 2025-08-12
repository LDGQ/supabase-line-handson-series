import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const main = async () => {
   console.log("Supabase 基本操作を開始します...");
   try {
      // ユーザー情報を保存
      const { error: insertError } = await supabase
      .from("users")
      .insert({ 
      line_user_id: "U1234567890abcdef", 
      display_name: "テストユーザー" 
      });

   if (insertError) {
      console.error("INSERT エラー:", insertError);
   } else {
      console.log("INSERT 成功");
   }

   // 保存したデータを取得
   const { data: selectData, error: selectError } = await supabase
      .from("users")
      .select("*");

   if (selectError) {
      console.error("SELECT エラー:", selectError);
   } else {
      console.log("SELECT 成功:", selectData);
   }
} catch (error) {
   console.error("予期しないエラー:", error);
}
};

main();
