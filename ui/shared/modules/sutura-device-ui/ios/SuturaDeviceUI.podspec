Pod::Spec.new do |s|
  s.name = 'SuturaDeviceUI'
  s.version = '1.0.0'
  s.summary = 'Device-themed UIKit controls for Sutura'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'Sutura'
  s.homepage = 'https://github.com/Mamadou8bah/sutura'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/Mamadou8bah/sutura.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
end
