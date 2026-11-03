import ExpoModulesCore
import PDFKit
import Vision
import UIKit

public class StatementPdfModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StatementPdf")
    AsyncFunction("extractPageLayout") { (uri: String, number: Int) -> [[String: Any]] in
      guard let url = URL(string: uri), url.isFileURL,
            let document = PDFDocument(url: url), !document.isLocked,
            number > 0, number <= document.pageCount,
            let page = document.page(at: number - 1), let text = page.string else { return [] }
      let bounds = page.bounds(for: .mediaBox)
      let expression = try NSRegularExpression(pattern: "\\S+")
      return expression.matches(in: text, range: NSRange(text.startIndex..., in: text)).compactMap { match in
        guard let selection = page.selection(for: match.range),
              let range = Range(match.range, in: text) else { return nil }
        let box = selection.bounds(for: page)
        return ["text": String(text[range]), "x": box.minX - bounds.minX,
                "y": bounds.maxY - box.midY, "width": box.width, "height": box.height]
      }
    }
    AsyncFunction("recognizePageLayout") { (uri: String, number: Int) -> [[String: Any]] in
      try autoreleasepool {
        guard let url = URL(string: uri), url.isFileURL,
              let document = PDFDocument(url: url), !document.isLocked,
              number > 0, number <= document.pageCount,
              let page = document.page(at: number - 1) else {
          throw NSError(domain: "StatementPdf", code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "PDF non leggibile o protetto."])
        }
        let bounds = page.bounds(for: .mediaBox)
        let scale = min(3, 2400 / max(bounds.width, bounds.height))
        let image = page.thumbnail(of: CGSize(width: bounds.width * scale, height: bounds.height * scale), for: .mediaBox)
        guard let cgImage = image.cgImage else {
          throw NSError(domain: "StatementPdf", code: 2,
                        userInfo: [NSLocalizedDescriptionKey: "Rendering PDF non riuscito."])
        }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["it-IT", "en-US"]
        request.usesLanguageCorrection = false
        try VNImageRequestHandler(cgImage: cgImage).perform([request])
        let expression = try NSRegularExpression(pattern: "\\S+")
        var words: [[String: Any]] = []
        for result in request.results ?? [] {
          guard let candidate = result.topCandidates(1).first else { continue }
          let text = candidate.string
          for match in expression.matches(in: text, range: NSRange(text.startIndex..., in: text)) {
            guard let range = Range(match.range, in: text),
                  let rectangle = try? candidate.boundingBox(for: range) else { continue }
            let box = rectangle.boundingBox
            words.append(["text": String(text[range]), "x": box.minX * bounds.width,
                          "y": (1 - box.midY) * bounds.height,
                          "width": box.width * bounds.width, "height": box.height * bounds.height])
          }
        }
        return words
      }
    }
    AsyncFunction("recognizePage") { (uri: String, number: Int) -> String in
      try autoreleasepool {
        guard let url = URL(string: uri), url.isFileURL,
              let document = PDFDocument(url: url), !document.isLocked,
              number > 0, number <= document.pageCount,
              let page = document.page(at: number - 1) else {
          throw NSError(domain: "StatementPdf", code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "PDF non leggibile o protetto."])
        }
        let bounds = page.bounds(for: .mediaBox)
        let scale = min(3, 2400 / max(bounds.width, bounds.height))
        let image = page.thumbnail(
          of: CGSize(width: bounds.width * scale, height: bounds.height * scale),
          for: .mediaBox
        )
        guard let cgImage = image.cgImage else {
          throw NSError(domain: "StatementPdf", code: 2,
                        userInfo: [NSLocalizedDescriptionKey: "Rendering PDF non riuscito."])
        }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["it-IT", "en-US"]
        request.usesLanguageCorrection = false
        try VNImageRequestHandler(cgImage: cgImage).perform([request])
        // Vision emits positioned boxes; rebuild rows before parsing bank columns.
        var rows: [(y: CGFloat, boxes: [(x: CGFloat, text: String)])] = []
        for result in request.results ?? [] {
          guard let text = result.topCandidates(1).first?.string else { continue }
          let box = result.boundingBox
          if let index = rows.firstIndex(where: { abs($0.y - box.midY) < 0.006 }) {
            rows[index].boxes.append((box.minX, text))
          } else {
            rows.append((box.midY, [(box.minX, text)]))
          }
        }
        return rows.sorted { $0.y > $1.y }.map { row in
          row.boxes.sorted { $0.x < $1.x }.map { $0.text }.joined(separator: " ")
        }.joined(separator: "\n")
      }
    }
  }
}
