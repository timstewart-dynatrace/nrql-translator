import React, { useState, useCallback } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import {
  Heading,
  Paragraph,
  Text,
  Code,
} from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { TextArea } from "@dynatrace/strato-components-preview/forms";
import { Modal } from "@dynatrace/strato-components-preview/overlays";
import { HelpIcon } from "@dynatrace/strato-icons";
import { sendIntent } from "@dynatrace-sdk/navigation";
import { NRQLToDQLTranslator } from "../utils/NRQLToDQLTranslator";
import { TranslationResult } from "../utils/types";

const APP_VERSION = "1.1.0";

export const Translator = () => {
  const [nrqlQuery, setNrqlQuery] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleTranslate = useCallback(() => {
    if (!nrqlQuery.trim()) {
      setError("Please enter an NRQL query");
      setResult(null);
      return;
    }

    try {
      const translator = new NRQLToDQLTranslator();
      const translationResult = translator.translate(nrqlQuery);
      setResult(translationResult);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
      setResult(null);
    }
  }, [nrqlQuery]);

  const handleCopyDQL = useCallback(() => {
    if (result?.dql) {
      navigator.clipboard.writeText(result.dql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleOpenInNotebook = useCallback(() => {
    if (result?.dql) {
      sendIntent(
        { "dt.query": result.dql },
        { recommendedAppId: "dynatrace.notebooks", recommendedIntentId: "view-query" }
      );
    }
  }, [result]);

  const handleOpenWith = useCallback(() => {
    if (result?.dql) {
      sendIntent({ "dt.query": result.dql });
    }
  }, [result]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "success";
      case "medium":
        return "warning";
      case "low":
        return "critical";
      default:
        return "neutral";
    }
  };

  return (
    <Flex flexDirection="column" gap={16} padding={32}>
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Flex flexDirection="column" gap={8}>
          <Heading level={1}>NRQL to DQL Translator</Heading>
          <Paragraph>
            Translate New Relic Query Language (NRQL) queries to Dynatrace Query
            Language (DQL) for migration.
          </Paragraph>
          <Text style={{ fontSize: "12px", color: "var(--dt-colors-text-neutral-default)" }}>
            v{APP_VERSION}
          </Text>
        </Flex>
        <Button onClick={() => setShowHelp(true)} variant="default">
          <Button.Prefix><HelpIcon /></Button.Prefix>
          Help
        </Button>
      </Flex>

      <Modal title="NRQL to DQL Translator — Help" show={showHelp} onDismiss={() => setShowHelp(false)} size="medium">
        <Flex flexDirection="column" gap={16}>
          <Flex flexDirection="column" gap={8}>
            <Text style={{ fontWeight: "bold" }}>How to use</Text>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li><Text>Paste your NRQL query into the input field</Text></li>
              <li><Text>Click <strong>Translate to DQL</strong> to convert it</Text></li>
              <li><Text>Review the translated DQL, confidence level, and any warnings</Text></li>
              <li><Text>Click <strong>Open in Notebook</strong> to test the query directly in a Dynatrace Notebook</Text></li>
              <li><Text>Or use <strong>Open with...</strong> to send it to any compatible Dynatrace app</Text></li>
              <li><Text>Use <strong>Copy DQL</strong> to copy the query to your clipboard</Text></li>
            </ol>
          </Flex>

          <Flex flexDirection="column" gap={8}>
            <Text style={{ fontWeight: "bold" }}>Supported NRQL features</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><Text>SELECT with aggregation functions (count, average, sum, min, max, percentile, uniqueCount, latest, earliest, stddev, median, rate, percentage, cdfPercentage, filter)</Text></li>
              <li><Text>FROM with event type mapping (Transaction, Span, Log, Metric, PageView, and more)</Text></li>
              <li><Text>WHERE clause with operators (=, !=, &gt;, &lt;, LIKE, IN, IS NULL, AND, OR, ago())</Text></li>
              <li><Text>FACET for grouping with CASES, hourOf, dateOf, weekOf; TIMESERIES for time-based charts</Text></li>
              <li><Text>ORDER BY, LIMIT, LIMIT MAX, COMPARE WITH, CASES, SLIDE BY (warning), and aliases (AS)</Text></li>
            </ul>
          </Flex>

          <Flex flexDirection="column" gap={8}>
            <Text style={{ fontWeight: "bold" }}>Confidence levels</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><Text><strong>HIGH</strong> — Direct mapping exists; query should work as-is</Text></li>
              <li><Text><strong>MEDIUM</strong> — Translated with some approximations; review recommended</Text></li>
              <li><Text><strong>LOW</strong> — Contains unsupported features; manual adjustment needed</Text></li>
            </ul>
          </Flex>

          <Surface>
            <Flex flexDirection="column" gap={4} padding={12}>
              <Text style={{ fontSize: "12px", color: "var(--dt-colors-text-neutral-default)" }}>
                v{APP_VERSION}
              </Text>
              <Text style={{ fontSize: "12px", color: "var(--dt-colors-text-neutral-default)" }}>
                This application was AI-generated from community-submitted and publicly available sources.
                It is not officially supported by Dynatrace. Always verify translated queries against
                official <a href="https://docs.dynatrace.com/docs" target="_blank" rel="noopener noreferrer">Dynatrace documentation</a>.
              </Text>
            </Flex>
          </Surface>
        </Flex>
      </Modal>

      <Surface>
        <Flex flexDirection="column" gap={16} padding={16}>
          <Flex flexDirection="column" gap={8}>
            <Text>
              <strong>NRQL Query</strong>
            </Text>
            <TextArea
              value={nrqlQuery}
              onChange={(e) => setNrqlQuery(e)}
              placeholder="SELECT count(*), average(duration) FROM Transaction WHERE appName = 'MyApp' FACET host TIMESERIES 5 minutes"
              style={{ minHeight: "120px", fontFamily: "monospace" }}
            />
          </Flex>

          <Button onClick={handleTranslate} variant="accent">
            Translate to DQL
          </Button>
        </Flex>
      </Surface>

      {error && (
        <Surface>
          <Flex padding={16}>
            <Text style={{ color: "var(--dt-colors-text-critical-default)" }}>
              {error}
            </Text>
          </Flex>
        </Surface>
      )}

      {result && (
        <Flex flexDirection="column" gap={16}>
          <Surface>
            <Flex flexDirection="column" gap={16} padding={16}>
              <Flex justifyContent="space-between" alignItems="center">
                <Flex alignItems="center" gap={8}>
                  <Text>
                    <strong>Translated DQL</strong>
                  </Text>
                  <Text
                    style={{
                      color: `var(--dt-colors-text-${getConfidenceColor(result.confidence)}-default)`,
                      fontWeight: "bold",
                    }}
                  >
                    [{result.confidence.toUpperCase()} confidence — {result.confidenceScore}/100]
                  </Text>
                </Flex>
                <Flex alignItems="center" gap={8}>
                  <Button onClick={handleOpenInNotebook} variant="accent">
                    Open in Notebook
                  </Button>
                  <Button onClick={handleOpenWith} variant="default">
                    Open with...
                  </Button>
                  <Button onClick={handleCopyDQL} variant="default">
                    {copied ? "Copied!" : "Copy DQL"}
                  </Button>
                </Flex>
              </Flex>

              <Code>{result.dql}</Code>
            </Flex>
          </Surface>

          {result.fixes.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text style={{ fontWeight: "bold" }}>Auto-corrections</Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.fixes.map((fix, index) => (
                    <li key={index}>
                      <Text>{fix}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Surface>
          )}

          {result.warnings.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text
                  style={{
                    color: "var(--dt-colors-text-warning-default)",
                    fontWeight: "bold",
                  }}
                >
                  Warnings
                </Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.warnings.map((warning, index) => (
                    <li key={index}>
                      <Text>{warning}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Surface>
          )}

          {result.notes.dataSourceMapping.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text style={{ fontWeight: "bold" }}>Data Source Mapping</Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.notes.dataSourceMapping.map((note, index) => (
                    <li key={index}>
                      <Text>{note}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Surface>
          )}

          {result.notes.fieldExtraction.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text style={{ fontWeight: "bold" }}>Field Extraction</Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.notes.fieldExtraction.map((note, index) => (
                    <li key={index}>
                      <Text>{note}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Surface>
          )}

          {result.notes.keyDifferences.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text style={{ fontWeight: "bold" }}>Key Differences</Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.notes.keyDifferences.map((note, index) => (
                    <li key={index}>
                      <Text>{note}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Surface>
          )}

          {result.notes.performanceConsiderations.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text style={{ fontWeight: "bold" }}>Performance Considerations</Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.notes.performanceConsiderations.map((note, index) => (
                    <li key={index}>
                      <Text>{note}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Surface>
          )}

          {result.notes.dataModelRequirements.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text style={{ fontWeight: "bold" }}>Data Model Requirements</Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.notes.dataModelRequirements.map((note, index) => (
                    <li key={index}>
                      <Text>{note}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Surface>
          )}

          {result.notes.testingRecommendations.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text style={{ fontWeight: "bold" }}>
                  Testing Recommendations
                </Text>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {result.notes.testingRecommendations.map((note, index) => (
                    <li key={index}>
                      <Text>{note}</Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Surface>
          )}
        </Flex>
      )}
    </Flex>
  );
};
