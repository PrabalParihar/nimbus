import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import axios from 'axios';

interface ContractData {
  id: string;
  name: string;
  description: string;
  status: string;
  timestamp: string;
}

const ContractInteraction: React.FC = () => {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contractName, setContractName] = useState('');
  const [contractDescription, setContractDescription] = useState('');

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock data for demonstration
      const mockContracts: ContractData[] = [
        {
          id: '1',
          name: 'Weather Data Collection',
          description: 'Smart contract for collecting weather data',
          status: 'Active',
          timestamp: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          name: 'Temperature Monitoring',
          description: 'Contract for monitoring temperature thresholds',
          status: 'Active',
          timestamp: '2024-01-01T11:00:00Z',
        },
      ];
      setContracts(mockContracts);
    } catch (err) {
      setError('Failed to fetch contracts');
    } finally {
      setLoading(false);
    }
  };

  const deployContract = async () => {
    if (!contractName || !contractDescription) {
      setError('Please enter both contract name and description');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await axios.post('http://localhost:3000/agent/process', {
        action: 'contract_interaction',
        data: {
          contractId: 'new',
          action: 'deploy',
          name: contractName,
          description: contractDescription,
        },
      });

      if (response.data.success) {
        // Add new contract to the list
        const newContract: ContractData = {
          id: (contracts.length + 1).toString(),
          name: contractName,
          description: contractDescription,
          status: 'Active',
          timestamp: new Date().toISOString(),
        };
        setContracts([...contracts, newContract]);
        setContractName('');
        setContractDescription('');
        setSuccess('Contract deployed successfully!');
      } else {
        setError(response.data.error || 'Failed to deploy contract');
      }
    } catch (err) {
      setError('Failed to deploy contract');
    } finally {
      setLoading(false);
    }
  };

  const interactWithContract = async (contractId: string, action: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await axios.post('http://localhost:3000/agent/process', {
        action: 'contract_interaction',
        data: {
          contractId,
          action,
        },
      });

      if (response.data.success) {
        setSuccess(`Contract ${action} successful!`);
      } else {
        setError(response.data.error || `Failed to ${action} contract`);
      }
    } catch (err) {
      setError(`Failed to ${action} contract`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Smart Contract Interaction
      </Typography>

      <Grid container spacing={3}>
        {/* Contract Deployment */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deploy New Contract
              </Typography>
              <TextField
                label="Contract Name"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                fullWidth
                margin="normal"
                disabled={loading}
              />
              <TextField
                label="Description"
                value={contractDescription}
                onChange={(e) => setContractDescription(e.target.value)}
                fullWidth
                margin="normal"
                multiline
                rows={3}
                disabled={loading}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={deployContract}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Deploying...' : 'Deploy Contract'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Contract Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Contract Statistics
              </Typography>
              <Typography variant="body1">
                Total Contracts: {contracts.length}
              </Typography>
              <Typography variant="body1">
                Active Contracts: {contracts.filter(c => c.status === 'Active').length}
              </Typography>
              <Typography variant="body1">
                Last Deployed: {contracts.length > 0 ? 
                  new Date(contracts[contracts.length - 1].timestamp).toLocaleString() : 'None'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Contract List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deployed Contracts
              </Typography>
              {contracts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No contracts deployed yet
                </Typography>
              ) : (
                <List>
                  {contracts.map((contract, index) => (
                    <React.Fragment key={contract.id}>
                      <ListItem>
                        <ListItemText
                          primary={contract.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {contract.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Status: {contract.status} | Deployed: {new Date(contract.timestamp).toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <Box sx={{ ml: 2 }}>
                          <Button
                            size="small"
                            onClick={() => interactWithContract(contract.id, 'read')}
                            disabled={loading}
                            sx={{ mr: 1 }}
                          >
                            Read
                          </Button>
                          <Button
                            size="small"
                            onClick={() => interactWithContract(contract.id, 'write')}
                            disabled={loading}
                            variant="outlined"
                          >
                            Write
                          </Button>
                        </Box>
                      </ListItem>
                      {index < contracts.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default ContractInteraction; 