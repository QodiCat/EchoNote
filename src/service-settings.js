let serviceSaving = false;

function showServiceStatus(result) {
  serviceReady = Boolean(result.configured && result.running && !result.error);
  $('serviceStatus').textContent = serviceReady
    ? '凭据已保存，本地服务已就绪（服务权限将在转录时验证）'
    : '转录尚未就绪，请填写凭据并保存';
  $('serviceError').textContent = result.error || '';
  if (state.phase === 'idle') $('recordHint').textContent = serviceReady
    ? '停止后自动转录' : '请先在设置中填写火山引擎凭据';
}

$('serviceForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (serviceSaving) return;
  if (state.phase !== 'idle') { $('serviceError').textContent = '请等待当前录音或转录结束后修改凭据'; return; }
  serviceSaving = true;
  $('saveService').disabled = true;
  try {
    const result = await window.echoNote.saveServiceSettings({
      appId: $('serviceAppId').value, accessToken: $('serviceAccessToken').value
    });
    if (result.error) throw new Error(result.error);
    $('serviceAccessToken').value = '';
    $('serviceAppId').value = '';
    showServiceStatus(result);
    toast('转录凭据已加密保存');
  } catch (error) { $('serviceError').textContent = error.message || '保存失败'; }
  finally { serviceSaving = false; $('saveService').disabled = false; }
});
$('settingsDialog').addEventListener('close', () => {
  $('serviceAccessToken').value = '';
  $('serviceAppId').value = '';
});
window.echoNote.getProxyStatus().then(showServiceStatus).catch(() => {
  showServiceStatus({ error: '无法读取转录配置，请重启应用' });
});
