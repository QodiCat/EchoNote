let shortcutSettings = { start: '', stop: '' };
let shortcutsLoading = true;
let shortcutsSaving = false;
$('settingsButton').disabled = true;

function updateShortcutHints() {
  $('recordButton').title = shortcutSettings.start ? `开始录音：${shortcutSettings.start}` : '开始录音';
  $('stopButton').title = shortcutSettings.stop ? `结束录音：${shortcutSettings.stop}` : '结束录音';
}

$('settingsButton').addEventListener('click', () => {
  $('startShortcut').value = shortcutSettings.start;
  $('stopShortcut').value = shortcutSettings.stop;
  $('saveShortcuts').disabled = shortcutsLoading;
  $('settingsDialog').showModal();
});
$('closeSettings').addEventListener('click', () => {
  if (!shortcutsSaving) $('settingsDialog').close();
});
$('settingsDialog').addEventListener('cancel', event => {
  if (shortcutsSaving) event.preventDefault();
});
$('settingsFolder').addEventListener('click', () => chooseDirectory().catch(error => toast(error.message)));
$('shortcutForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (shortcutsSaving || shortcutsLoading) return;
  shortcutsSaving = true;
  $('saveShortcuts').disabled = true;
  $('shortcutError').textContent = '';
  try {
    const result = await window.echoNote.saveShortcuts({ start: $('startShortcut').value, stop: $('stopShortcut').value });
    if (result.error) throw new Error(result.error);
    shortcutSettings = result.settings;
    updateShortcutHints();
    $('settingsDialog').close();
    toast('快捷键已保存');
  } catch (error) { $('shortcutError').textContent = error.message || '快捷键保存失败'; }
  finally { shortcutsSaving = false; $('saveShortcuts').disabled = false; }
});

window.echoNote.getShortcuts().then(result => {
  shortcutSettings = result.settings;
  updateShortcutHints();
  $('shortcutError').textContent = result.error || '';
  if (result.error) toast(result.error);
}).catch(() => {
  $('shortcutError').textContent = '无法读取快捷键设置，请重新保存';
  toast('无法读取快捷键设置，请打开设置检查');
}).finally(() => { shortcutsLoading = false; $('saveShortcuts').disabled = false; $('settingsButton').disabled = false; });
