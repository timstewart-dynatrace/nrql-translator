import React, { useState, useCallback } from 'react';
import {
  Flex,
  Heading,
  Text,
  TextArea,
  Button,
  Surface,
  Code,
  Badge,
  List,
} from '@dynatrace/strato-components-preview';
import { NRQLToDQLTranslator } from '../utils/NRQLToDQLTranslator';

interface TranslationResult {
  dql: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  notes: {
    dataSourceMapping: string[];
    keyDifferences: string[];
    testingRecommendations: string[];
  };
}

export const TranslatorPage: React.FC = () => {
  const [nrqlQuery, setNrqlQuery] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = useCallback(() => {
    if (!nrqlQuery.trim()) {
      setError('Please enter an NRQL query');
      setResult(null);
      return;
    }

    try {
      const translator = new NRQLToDQLTranslator();
      const translationResult = translator.translate(nrqlQuery);
      setResult(translationResult);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
      setResult(null);
    }
  }, [nrqlQuery]);

  const handleCopyDQL = useCallback(() => {
    if (result?.dql) {
      navigator.clipboard.writeText(result.dql);
    }
  }, [result]);

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      case 'low':
        return 'critical';
      default:
        return 'neutral';
    }
  };

  return (
    <Flex flexDirection="column" gap={16} padding={32}>
      <Flex flexDirection="column" gap={8}>
        <Heading level={1}>NRQL to DQL Translator</Heading>
        <Text>
          Translate New Relic Query Language (NRQL) queries to Dynatrace Query
          Language (DQL) for migration.
        </Text>
      </Flex>

      <Surface>
        <Flex flexDirection="column" gap={16} padding={16}>
          <Flex flexDirection="column" gap={8}>
            <Text as="label" htmlFor="nrql-input">
              <strong>NRQL Query</strong>
            </Text>
            <TextArea
              id="nrql-input"
              value={nrqlQuery}
              onChange={(e) => setNrqlQuery(e.target.value)}
              placeholder="SELECT count(*), average(duration) FROM Transaction WHERE appName = 'MyApp' FACET host TIMESERIES 5 minutes"
              rows={6}
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
            <Text color="critical">{error}</Text>
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
                  <Badge color={getConfidenceBadgeColor(result.confidence)}>
                    {result.confidence.toUpperCase()} confidence
                  </Badge>
                </Flex>
                <Button onClick={handleCopyDQL} variant="default">
                  Copy DQL
                </Button>
              </Flex>

              <Code language="sql">{result.dql}</Code>
            </Flex>
          </Surface>

          {result.warnings.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text color="warning">
                  <strong>Warnings</strong>
                </Text>
                <List>
                  {result.warnings.map((warning, index) => (
                    <List.Item key={index}>
                      <Text>{warning}</Text>
                    </List.Item>
                  ))}
                </List>
              </Flex>
            </Surface>
          )}

          {result.notes.dataSourceMapping.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text>
                  <strong>Data Source Mapping</strong>
                </Text>
                <List>
                  {result.notes.dataSourceMapping.map((note, index) => (
                    <List.Item key={index}>
                      <Text>{note}</Text>
                    </List.Item>
                  ))}
                </List>
              </Flex>
            </Surface>
          )}

          {result.notes.keyDifferences.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text>
                  <strong>Key Differences</strong>
                </Text>
                <List>
                  {result.notes.keyDifferences.map((note, index) => (
                    <List.Item key={index}>
                      <Text>{note}</Text>
                    </List.Item>
                  ))}
                </List>
              </Flex>
            </Surface>
          )}

          {result.notes.testingRecommendations.length > 0 && (
            <Surface>
              <Flex flexDirection="column" gap={8} padding={16}>
                <Text>
                  <strong>Testing Recommendations</strong>
                </Text>
                <List>
                  {result.notes.testingRecommendations.map((note, index) => (
                    <List.Item key={index}>
                      <Text>{note}</Text>
                    </List.Item>
                  ))}
                </List>
              </Flex>
            </Surface>
          )}
        </Flex>
      )}
    </Flex>
  );
};
