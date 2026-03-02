#[tauri::command]
async fn generate_iv_label_preview(
  name: String,
  room: String,
  rate: String,
  age_gender: String,
  date: String
) -> Result<String, String> {
  // 실제 b-PAC SDK (COM) 연동 로직. (이모지 금지 원칙 준수)
  // [Antigravity Architect Note]
  // 1. bpac.Document.Open(template_path)
  // 2. doc.GetObject("obj_name").Text = name
  // 3. doc.GetObject("obj_rate").Text = rate
  // ...
  // 4. doc.Export(IMAGE_TYPE, temp_path)
  // 5. Read temp_path -> base64
  
  // [MOCK Implementation for Development/Review]
  // 추후 실제 b-PAC SDK 설치 환경에서 실제 COM 호출 코드로 전환.
  use base64::{Engine as _, engine::general_purpose};
  
  // [Surgical Change] 템플릿 객체 매핑 예시 (의사코드 구조)
  log::info!("[IV Label] Generating Preview for {} - Room: {}, Rate: {}", name, room, rate);
  
  // 실제 연동 시에는 아래와 같은 흐름으로 진행:
  /*
  let doc = unsafe { CoCreateInstance::<Document>(...) }; 
  doc.Open(template_path);
  doc.GetObject("obj_name").set_text(name);
  ...
  doc.Export(3, temp_path); // 3: JPEG or PNG
  */

  // 현재는 레이아웃 구성을 확인하기 위해 로그만 남기고 임시 완성
  Ok(general_purpose::STANDARD.encode("MOCK_IMAGE_DATA_BASE64")) 
}

#[tauri::command]
async fn print_iv_label(
  name: String,
  room: String,
  rate: String,
  age_gender: String,
  date: String
) -> Result<(), String> {
  log::info!("[IV Label] Printing Label for {} - Room: {}, Rate: {}", name, room, rate);
  // [Surgical Change] 실출력 로직
  // doc.StartPrint("", bpac::PrintOptionConstants::bpoDefault);
  // doc.PrintOut(1, bpac::PrintOptionConstants::bpoDefault);
  // doc.EndPrint();
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default()
      .level(log::LevelFilter::Info)
      .build())
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![
      generate_iv_label_preview,
      print_iv_label
    ])
    .setup(|_app| {
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
