Pod::Spec.new do |s|
  s.name = 'StatementPdf'
  s.version = '1.0.0'
  s.summary = 'On-device OCR for statement PDF pages'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'MyBalance'
  s.homepage = 'https://github.com/fabioaltea/my-balance-expo'
  s.source = { :git => 'https://github.com/fabioaltea/my-balance-expo.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'PDFKit', 'Vision', 'UIKit'
  s.source_files = '**/*.{h,m,mm,swift}'
end
