import time
import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvNet(nn.Module):
    def __init__(self, mode):
        super(ConvNet, self).__init__()

        self.fcl1 = nn.Linear(28 * 28, 100)
        self.ofcl1 = nn.Linear(100, 10)

        self.conv1 = nn.Conv2d(1, 40, 5)
        self.maxpool = nn.MaxPool2d((2, 2))
        self.conv2 = nn.Conv2d(40, 40, 5)
        self.fcl2 = nn.Linear(640, 100)
        self.ofcl2 = nn.Linear(100, 100)

        self.dropout = nn.Dropout(p=0.5)

        # Define various layers here, such as in the tutorial example
        # self.conv1 = nn.Conv2D(...)

        # This will select the forward pass function based on mode for the ConvNet.
        # Based on the question, you have 5 modes available for step 1 to 5.
        # During creation of each ConvNet model, you will assign one of the valid mode.
        # This will fix the forward function (and the network graph) for the entire training/testing
        if mode == 1:
            self.forward = self.model_1
        elif mode == 2:
            self.forward = self.model_2
        elif mode == 3:
            self.forward = self.model_3
        elif mode == 4:
            self.forward = self.model_4
        elif mode == 5:
            self.forward = self.model_5
        else:
            print("Invalid mode ", mode, "selected. Select between 1-5")
            exit(0)

    # Baseline model. step 1
    def model_1(self, X):
        # ======================================================================
        # One fully connected layer.
        #
        x = X.view(X.shape[0], -1)
        fcl = self.fcl1(x)
        fcl = F.sigmoid(fcl)
        fcl = self.ofcl1(fcl)
        # ----------------- YOUR CODE HERE ----------------------
        #
        # Uncomment the following return stmt once method implementation is done.
        return fcl
        # Delete line return NotImplementedError() once method is implemented.
        # return NotImplementedError()

    # Use two convolutional layers.
    def model_2(self, X):
        # ======================================================================
        # Two convolutional layers + one fully connnected layer.
        #
        # ----------------- YOUR CODE HERE ----------------------
        #
        X = torch.sigmoid(self.conv1(X))
        X = self.maxpool(X)
        X = torch.sigmoid(self.conv2(X))
        X = self.maxpool(X)
        x = X.view(X.shape[0], -1)
        fcl = self.fcl2(x)
        fcl = torch.sigmoid(fcl)
        fcl = self.ofcl1(fcl)
        # Uncomment the following return stmt once method implementation is done.
        return fcl
        # Delete line return NotImplementedError() once method is implemented.
        # return NotImplementedError()

    # Replace sigmoid with ReLU.
    def model_3(self, X):
        # ======================================================================
        # Two convolutional layers + one fully connected layer, with ReLU.
        #
        # ----------------- YOUR CODE HERE ----------------------
        #
        X = torch.relu(self.conv1(X))
        X = self.maxpool(X)
        X = torch.relu(self.conv2(X))
        X = self.maxpool(X)
        x = X.view(X.shape[0], -1)
        fcl = self.fcl2(x)
        fcl = torch.relu(fcl)
        fcl = self.ofcl1(fcl)
        # Uncomment the following return stmt once method implementation is done.
        return fcl
        # Delete line return NotImplementedError() once method is implemented.
        # return NotImplementedError()

    # Add one extra fully connected layer.
    def model_4(self, X):
        # ======================================================================
        # Two convolutional layers + two fully connected layers, with ReLU.
        #
        # ----------------- YOUR CODE HERE ----------------------
        #
        X = F.relu(self.conv1(X))
        X = self.maxpool(X)
        X = F.relu(self.conv2(X))
        X = self.maxpool(X)
        x = X.view(X.shape[0], -1)
        fcl = F.relu(self.fcl2(x))
        fcl = F.relu(self.ofcl2(fcl))
        fcl = self.ofcl1(fcl)
        # Uncomment the following return stmt once method implementation is done.
        return fcl
        # Delete line return NotImplementedError() once method is implemented.
        # return NotImplementedError()

    # Use Dropout now.
    def model_5(self, X):
        X = F.relu(self.conv1(X))
        X = self.maxpool(X)
        X = F.relu(self.conv2(X))
        X = self.maxpool(X)
        x = X.view(X.shape[0], -1)
        fcl = F.relu(self.fcl2(x))
        fcl = F.relu(self.ofcl2(fcl))
        fcl = self.dropout(fcl)
        fcl = self.ofcl1(fcl)
        return fcl
        # Two convolutional layers + two fully connected layers, with ReLU.
        # and  + Dropout.
        #
        # ----------------- YOUR CODE HERE ----------------------
        #

        # Uncomment the following return stmt once method implementation is done.
        # return  fcl
        # Delete line return NotImplementedError() once method is implemented.
