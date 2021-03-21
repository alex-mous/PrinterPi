# Changelog
All notable changes to the PrinterPiExtension code will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.1.1] - 2021-01-17
### Changed
- Fixed rounding error with tax field when on eBay Regular page (causing incorrect values to be present in resulting receipt)

## [7.2.0] - 2021-02-15
### Changed
- Fixed bug with new eBay update
- Changed extension logo
- Improved interface for adding/removing orders (changed to more logical labelling system and increment/decrement when removing orders)
- Added bulk printing for envelopes

## [7.2.1] - 2021-02-15
### Added
- Add saving to edited data fields
### Changed
- Fix bug with printing all envelopes

## [7.2.2] - 2021-02-27
### Changed
- Fix interface to work with latest eBay Print Label page

## [7.2.3] - 2021-03-07
### Added
- Add support for no SKU items in Bulk Shipping Label printing

## [7.2.4] - 2021-03-08
### Added
- Add support for no SKU items in Regular Shipping Label printing

## [7.2.5] - 2021-03-21
### Changed
- Fix bug with non-invoice payments on PayPal
- Fix compatibility with eBay Bulk Shipping Label printing update