// Development-only native review window. Never part of the distributable.
const {app,BrowserWindow}=require('electron');
app.setName('Devast media review');
app.whenReady().then(()=>{
 const win=new BrowserWindow({width:1000,height:850,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.once('ready-to-show',()=>win.show());
 win.loadURL('http://127.0.0.1:5173/tools/'+(process.argv.includes('--performance')?'runtime-review':'audio-review')+'.html');
});
app.on('window-all-closed',()=>app.quit());
