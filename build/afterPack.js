const { execFileSync } = require('child_process');
const path = require('path');

// electron-builder geçerli bir sertifika bulamadığında macOS imzalamasını tamamen atlar.
// Geriye Electron'un kendi linker imzası kalır; bu imza pakete sonradan eklenen dosyaları
// kapsamadığı için Gatekeeper uygulamayı "zarar görmüş" sayar. Dağıtılabilir bir ad-hoc
// imzayı burada üretiyoruz.
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);

  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--strict', appPath], { stdio: 'inherit' });
};
