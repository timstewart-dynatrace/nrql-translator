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
import { NRQLToDQLTranslator } from "../utils/NRQLToDQLTranslator";
import { TranslationResult } from "../utils/types";

const APP_VERSION = "1.0.12";

export const Translator = () => {
  const [nrqlQuery, setNrqlQuery] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
                    [{result.confidence.toUpperCase()} confidence]
                  </Text>
                </Flex>
                <Button onClick={handleCopyDQL} variant="default">
                  {copied ? "Copied!" : "Copy DQL"}
                </Button>
              </Flex>

              <Code>{result.dql}</Code>
            </Flex>
          </Surface>

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
