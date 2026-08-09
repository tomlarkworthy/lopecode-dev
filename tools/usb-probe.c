// Why can't adb see the phone? This walks the same path adb's usb_osx.cpp walks
// and prints the kern_return at each step, so a sandbox denial (0xe00002e2, NOT
// PERMITTED) is distinguishable from a device another process already holds
// (0xe00002c5, exclusive access) and from a phone that is simply not in ADB mode.
//
// adb matches USB *interfaces* with class 255 / subclass 66 / protocol 1. A phone
// in "charging only" or MIDI mode publishes no such interface, and adb then prints
// an empty device list -- which looks exactly like a blocked sandbox.
//
//   clang -o tools/usb-probe tools/usb-probe.c -framework IOKit -framework CoreFoundation
//   ./tools/usb-probe
#include <stdio.h>
#include <IOKit/IOKitLib.h>
#include <IOKit/IOCFPlugIn.h>
#include <IOKit/usb/IOUSBLib.h>
#include <CoreFoundation/CoreFoundation.h>

static int prop(io_service_t s, CFStringRef key) {
  CFNumberRef n = IORegistryEntrySearchCFProperty(s, kIOServicePlane, key, NULL, 0);
  int v = -1;
  if (n) { CFNumberGetValue(n, kCFNumberIntType, &v); CFRelease(n); }
  return v;
}

static void devices(void) {
  io_iterator_t it;
  kern_return_t kr = IOServiceGetMatchingServices(
      kIOMainPortDefault, IOServiceMatching(kIOUSBDeviceClassName), &it);
  printf("devices: IOServiceGetMatchingServices = 0x%x\n", kr);
  if (kr != KERN_SUCCESS) return;

  io_service_t dev;
  while ((dev = IOIteratorNext(it))) {
    io_name_t name = {0};
    IORegistryEntryGetName(dev, name);

    IOCFPlugInInterface **plugin = NULL;
    SInt32 score = 0;
    kr = IOCreatePlugInInterfaceForService(dev, kIOUSBDeviceUserClientTypeID,
                                           kIOCFPlugInInterfaceID, &plugin, &score);
    if (kr != KERN_SUCCESS || !plugin) {
      printf("  %-32s IOCreatePlugInInterfaceForService = 0x%x\n", name, kr);
      IOObjectRelease(dev);
      continue;
    }
    IOUSBDeviceInterface197 **usb = NULL;
    HRESULT hr = (*plugin)->QueryInterface(
        plugin, CFUUIDGetUUIDBytes(kIOUSBDeviceInterfaceID197), (LPVOID *)&usb);
    (*plugin)->Release(plugin);
    if (hr || !usb) {
      printf("  %-32s QueryInterface = 0x%x\n", name, (unsigned)hr);
      IOObjectRelease(dev);
      continue;
    }
    kr = (*usb)->USBDeviceOpen(usb);   // the call the sandbox gates via iokit-open
    printf("  %-32s USBDeviceOpen = 0x%x%s\n", name, kr,
           kr == KERN_SUCCESS           ? " (ok)"
           : kr == kIOReturnExclusiveAccess ? " (exclusive access -- another process holds it)"
           : kr == kIOReturnNotPermitted    ? " (NOT PERMITTED -- sandbox)" : "");
    if (kr == KERN_SUCCESS) (*usb)->USBDeviceClose(usb);
    (*usb)->Release(usb);
    IOObjectRelease(dev);
  }
  IOObjectRelease(it);
}

static void interfaces(void) {
  io_iterator_t it;
  kern_return_t kr = IOServiceGetMatchingServices(
      kIOMainPortDefault, IOServiceMatching(kIOUSBInterfaceClassName), &it);
  printf("\ninterfaces: IOServiceGetMatchingServices = 0x%x\n", kr);
  if (kr != KERN_SUCCESS) return;

  io_service_t s;
  int adb = 0;
  while ((s = IOIteratorNext(it))) {
    io_name_t name = {0};
    IORegistryEntryGetName(s, name);
    int c = prop(s, CFSTR("bInterfaceClass"));
    int sc = prop(s, CFSTR("bInterfaceSubClass"));
    int pr = prop(s, CFSTR("bInterfaceProtocol"));
    int is_adb = (c == 255 && sc == 66 && pr == 1);
    adb += is_adb;
    printf("  %-32s class=%-3d subclass=%-3d protocol=%-3d%s\n",
           name, c, sc, pr, is_adb ? "  <- adb" : "");
    IOObjectRelease(s);
  }
  IOObjectRelease(it);
  printf("\n%d adb interface(s) (255/66/1). Zero means no phone is in ADB mode,\n"
         "whatever the sandbox is doing.\n", adb);
}

int main(void) { devices(); interfaces(); return 0; }
