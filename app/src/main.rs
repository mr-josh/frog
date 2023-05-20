#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, WindowBuilder,
    WindowUrl,
};

fn main() {
    let menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("add_frog".to_string(), "Add Frog"))
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));

    let tray = SystemTray::new().with_menu(menu);

    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "add_frog" => {
                    let new_frog = WindowBuilder::new(
                        app,
                        format!("frog-{}", app.windows().len()),
                        WindowUrl::App("index.html".into()),
                    )
                    .inner_size(200.0, 200.0)
                    .resizable(false)
                    .transparent(true)
                    .always_on_top(true)
                    .decorations(false)
                    .skip_taskbar(true)
                    .build();

                    if let Err(e) = new_frog {
                        eprintln!("{}", e);
                        return;
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
